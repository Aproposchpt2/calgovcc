// NGCC — Analyze Fit
// Generates a 14-section AI bid/no-bid analysis for a federal or state contract.
// Uses Claude to match the opportunity against the subscriber's NAICS profile.
// Env: ANTHROPIC_API_KEY, ANTHROPIC_MODEL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const SB_URL          = process.env.SUPABASE_URL;
const SB_KEY          = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function sbH() {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

async function getSubscriber(email) {
  const res  = await fetch(
    `${SB_URL}/rest/v1/ngcc_subscribers?email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: sbH() }
  );
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : null;
}

function buildPrompt(contract, subscriber) {
  const bizName   = subscriber.entity_name || subscriber.business_name || 'the business';
  const naics     = (subscriber.naics_codes || []).join(', ') || 'not provided';
  const uei       = subscriber.uei || 'not provided';
  const keywords  = (subscriber.keywords || []).join(', ') || 'none provided';
  const source    = contract.source === 'nevada' ? 'Nevada state' : 'federal (SAM.gov)';

  return `You are a government contracting expert analyzing a ${source} contract opportunity for a small business.

BUSINESS PROFILE:
- Business name: ${bizName}
- UEI (SAM.gov): ${uei}
- NAICS codes: ${naics}
- Capability keywords: ${keywords}

CONTRACT OPPORTUNITY:
- Title: ${contract.title || 'Not provided'}
- Agency: ${contract.agency || 'Not provided'}
- Notice ID: ${contract.noticeId || contract.id || 'Not provided'}
- NAICS: ${contract.naicsCode || 'Not provided'}
- Set-Aside: ${contract.setAside || contract.type || 'None specified'}
- Deadline: ${contract.responseDeadline || contract.deadline || contract.close_date || 'Not provided'}
- Description: ${(contract.description || '').slice(0, 600) || 'Not provided'}
- Source: ${source}

Generate a concise, practical bid/no-bid analysis with EXACTLY these 14 sections. Return as JSON with section numbers as keys (s1 through s14). Each section value is a plain string (1-4 sentences). No markdown, no bullet lists inside strings.

{
  "fitScore": <integer 0-100>,
  "recommendation": <"PURSUE" | "REVIEW" | "PASS">,
  "s1": "Opportunity Summary — what this contract is for",
  "s2": "Why NGCC Matched This — specific alignment with the business profile",
  "s3": "Eligibility Review — set-aside eligibility and any certification requirements",
  "s4": "Capability Match — how well the NAICS codes and capabilities align (HIGH/MEDIUM/LOW)",
  "s5": "Bid / No-Bid Rationale — clear recommendation and primary reason",
  "s6": "Performance Requirements — key deliverables and execution demands",
  "s7": "Staffing and Delivery — personnel, location, and delivery timeline expectations",
  "s8": "Compliance Requirements — registrations, certifications, or compliance standards required",
  "s9": "Deadline Risk — urgency assessment and timeline to respond",
  "s10": "Pricing Considerations — typical pricing approach and rate considerations for this contract type",
  "s11": "Draft Technical Approach — opening paragraph for a technical approach section",
  "s12": "Proposal Checklist — the 5 most critical items to include in this proposal",
  "s13": "Questions for the Contracting Officer — 3 smart clarifying questions to ask",
  "s14": "Recommended Next Step — the single most important action to take in the next 48 hours"
}`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!ANTHROPIC_KEY) return json({ error: 'AI analysis not configured' }, 500);

  let body;
  try { body = await req.json(); } catch(_) { return json({ error: 'Invalid request body' }, 400); }

  const { contract, email } = body;
  if (!contract || !email) return json({ error: 'contract and email required' }, 400);

  // Verify active subscriber
  const subscriber = await getSubscriber(email.toLowerCase());
  if (!subscriber || subscriber.status !== 'active') {
    return json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' }, 403);
  }

  try {
    const prompt = buildPrompt(contract, subscriber);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      ANTHROPIC_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`Anthropic ${aiRes.status}: ${t.slice(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const raw    = aiData.content?.[0]?.text || '';

    // Extract JSON from response
    const match  = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain valid JSON');

    const analysis = JSON.parse(match[0]);

    return json({
      ok:           true,
      fitScore:     analysis.fitScore     || 0,
      recommendation: analysis.recommendation || 'REVIEW',
      sections: {
        s1:  analysis.s1  || '',
        s2:  analysis.s2  || '',
        s3:  analysis.s3  || '',
        s4:  analysis.s4  || '',
        s5:  analysis.s5  || '',
        s6:  analysis.s6  || '',
        s7:  analysis.s7  || '',
        s8:  analysis.s8  || '',
        s9:  analysis.s9  || '',
        s10: analysis.s10 || '',
        s11: analysis.s11 || '',
        s12: analysis.s12 || '',
        s13: analysis.s13 || '',
        s14: analysis.s14 || '',
      },
      contract: {
        title:  contract.title,
        agency: contract.agency,
        source: contract.source,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[ngcc-analyze-fit]', err.message);
    return json({ error: 'Analysis failed. Please try again.', detail: err.message }, 200);
  }
};

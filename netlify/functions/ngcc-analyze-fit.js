// California Government Contract Center — Contract Fit Intelligence v1
// Primary engine: OpenAI Responses API with strict structured output.
// Fallback engine: Anthropic Messages API.
// Required env: OPENAI_API_KEY or ANTHROPIC_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (SUPABASE_SERVICE_KEY also supported).

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function env(name) {
  try {
    return Netlify.env.get(name) || '';
  } catch (_) {
    return process.env[name] || '';
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch (_) {}
    return value.split(/[,;|\n]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

function cleanText(value, max = 5000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function getBusinessProfile(subscriber) {
  return {
    businessName: subscriber.entity_name || subscriber.business_name || 'Business profile',
    uei: subscriber.uei || subscriber.uei_number || 'Not provided',
    naicsCodes: normalizeArray(subscriber.naics_codes || subscriber.naics),
    keywords: normalizeArray(subscriber.keywords || subscriber.capability_keywords || subscriber.services),
    certifications: normalizeArray(
      subscriber.certifications || subscriber.business_certifications || subscriber.set_asides
    ),
    licenses: normalizeArray(subscriber.licenses || subscriber.professional_licenses),
    locations: normalizeArray(subscriber.service_areas || subscriber.locations || subscriber.states_served),
    pastPerformance: cleanText(
      subscriber.past_performance || subscriber.experience_summary || subscriber.capability_statement,
      3000
    ),
  };
}

function getContractProfile(contract) {
  return {
    id: contract.noticeId || contract.solicitation_no || contract.id || 'Not provided',
    title: cleanText(contract.title, 500) || 'Untitled opportunity',
    agency: cleanText(contract.agency, 500) || 'Agency not provided',
    source: cleanText(contract.source || contract.portal || 'California public procurement', 200),
    naicsCode: cleanText(contract.naicsCode || contract.naics_code, 100),
    setAside: cleanText(contract.setAside || contract.set_aside || contract.type, 500),
    deadline: cleanText(
      contract.responseDeadline || contract.deadline || contract.close_date || contract.due_date,
      200
    ),
    location: cleanText(contract.placeOfPerformance || contract.location || contract.delivery_location, 500),
    description: cleanText(
      contract.description || contract.summary || contract.scope || contract.full_description,
      7000
    ),
    url: cleanText(contract.url || contract.link, 1000),
  };
}

async function getSubscriber(email) {
  const sbUrl = env('SUPABASE_URL');
  const sbKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_KEY');
  if (!sbUrl || !sbKey) throw new Error('Subscriber database is not configured');

  const res = await fetch(
    `${sbUrl}/rest/v1/ngcc_subscribers?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) throw new Error(`Subscriber lookup failed (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : null;
}

const SECTION_SCHEMA = Object.fromEntries(
  Array.from({ length: 14 }, (_, i) => [`s${i + 1}`, { type: 'string' }])
);

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'componentScores', 'recommendation', 'hardStops', 'verificationItems',
    ...Array.from({ length: 14 }, (_, i) => `s${i + 1}`),
  ],
  properties: {
    componentScores: {
      type: 'object',
      additionalProperties: false,
      required: [
        'capabilityMatch', 'industryAlignment', 'eligibility', 'pastPerformance',
        'geography', 'proposalReadiness', 'deadlineReadiness',
      ],
      properties: {
        capabilityMatch: { type: 'integer', minimum: 0, maximum: 100 },
        industryAlignment: { type: 'integer', minimum: 0, maximum: 100 },
        eligibility: { type: 'integer', minimum: 0, maximum: 100 },
        pastPerformance: { type: 'integer', minimum: 0, maximum: 100 },
        geography: { type: 'integer', minimum: 0, maximum: 100 },
        proposalReadiness: { type: 'integer', minimum: 0, maximum: 100 },
        deadlineReadiness: { type: 'integer', minimum: 0, maximum: 100 },
      },
    },
    recommendation: { type: 'string', enum: ['PURSUE', 'REVIEW', 'PASS'] },
    hardStops: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'status', 'reason'],
        properties: {
          type: {
            type: 'string',
            enum: ['SET_ASIDE', 'CERTIFICATION', 'LICENSE', 'BONDING', 'GEOGRAPHY', 'DEADLINE', 'OTHER'],
          },
          status: { type: 'string', enum: ['CONFIRMED_FAIL', 'REQUIRES_VERIFICATION'] },
          reason: { type: 'string' },
        },
      },
    },
    verificationItems: { type: 'array', items: { type: 'string' } },
    ...SECTION_SCHEMA,
  },
};

function buildPrompt(business, contract) {
  return `You are the California Government Contract Center Contract Fit Analyst.

Your task is to produce a disciplined bid/no-bid analysis. Never invent qualifications, certifications, licenses, bonding, past performance, solicitation requirements, or eligibility. Distinguish facts from inference.

EVIDENCE LABELS — begin every sentence containing a material claim with exactly one label:
[Confirmed] explicitly present in the contract data.
[Business Profile] explicitly present in the subscriber profile.
[Reasonable Inference] a cautious inference from the supplied data.
[Requires Verification] not established by the supplied data.

MANDATORY DECISION RULES:
1. A confirmed mandatory eligibility failure overrides technical fit and requires PASS.
2. A possible but unverified mandatory requirement requires REVIEW, not PURSUE.
3. Missing data is not proof of qualification.
4. Do not treat a title or keyword overlap as proof of capability.
5. Evaluate California-specific supplier diversity, licensing, geography, bonding, registration, and deadline requirements when they appear in the data.
6. Proposal readiness must reflect the time remaining and the amount of missing information.

SCORING WEIGHTS used by the application:
Capability Match 25%; Industry Alignment 15%; Eligibility 20%; Past Performance 15%; Geography 10%; Proposal Readiness 10%; Deadline Readiness 5%.

BUSINESS PROFILE:
${JSON.stringify(business, null, 2)}

CONTRACT PROFILE:
${JSON.stringify(contract, null, 2)}

Return the requested structured object. Keep each report section concise but specific.
Section requirements:
s1 Opportunity Summary.
s2 Why the platform matched it.
s3 Eligibility Review, including hard-stop analysis.
s4 Capability Match.
s5 Bid/No-Bid Rationale.
s6 Performance Requirements.
s7 Staffing and Delivery.
s8 Compliance Requirements.
s9 Deadline Risk.
s10 Pricing Considerations without inventing prices.
s11 Draft Technical Approach, clearly labeled as a draft based only on known facts.
s12 Proposal Checklist with the five most critical items in a semicolon-separated sentence.
s13 Three questions for the contracting officer in a numbered sentence.
s14 The single most important next action within 48 hours.`;
}

async function callOpenAI(prompt) {
  const apiKey = env('OPENAI_API_KEY');
  if (!apiKey) return null;

  const model = env('OPENAI_MODEL') || 'gpt-5';
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'Return only data that conforms to the supplied JSON schema.' },
        { role: 'user', content: prompt },
      ],
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'contract_fit_analysis',
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI analysis failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.output_text || data.output?.flatMap(item => item.content || [])
    .find(item => item.type === 'output_text')?.text;
  if (!raw) throw new Error('OpenAI returned no structured analysis');
  return JSON.parse(raw);
}

async function callAnthropic(prompt) {
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const model = env('ANTHROPIC_MODEL') || 'claude-sonnet-4-6';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 3500,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nReturn valid JSON only. Use this schema exactly: ${JSON.stringify(ANALYSIS_SCHEMA)}`,
      }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic analysis failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.content?.find(item => item.type === 'text')?.text || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Anthropic returned no valid JSON object');
  return JSON.parse(match[0]);
}

function calculateDecision(analysis) {
  const s = analysis.componentScores || {};
  const weighted = Math.round(
    (Number(s.capabilityMatch || 0) * 0.25) +
    (Number(s.industryAlignment || 0) * 0.15) +
    (Number(s.eligibility || 0) * 0.20) +
    (Number(s.pastPerformance || 0) * 0.15) +
    (Number(s.geography || 0) * 0.10) +
    (Number(s.proposalReadiness || 0) * 0.10) +
    (Number(s.deadlineReadiness || 0) * 0.05)
  );

  const hardStops = Array.isArray(analysis.hardStops) ? analysis.hardStops : [];
  const confirmedFailure = hardStops.some(item => item.status === 'CONFIRMED_FAIL');
  const verificationRequired = hardStops.some(item => item.status === 'REQUIRES_VERIFICATION');

  let recommendation = weighted >= 75 ? 'PURSUE' : weighted >= 50 ? 'REVIEW' : 'PASS';
  let fitScore = weighted;

  if (confirmedFailure) {
    recommendation = 'PASS';
    fitScore = Math.min(fitScore, 49);
  } else if (verificationRequired && recommendation === 'PURSUE') {
    recommendation = 'REVIEW';
    fitScore = Math.min(fitScore, 74);
  }

  return { fitScore, recommendation, hardStops, componentScores: s };
}

function validateSections(analysis) {
  for (let i = 1; i <= 14; i += 1) {
    const key = `s${i}`;
    if (typeof analysis[key] !== 'string' || !analysis[key].trim()) {
      analysis[key] = '[Requires Verification] Analysis was not available for this section.';
    }
  }
  return analysis;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: 'Invalid request body' }, 400);
  }

  const email = String(body?.email || '').trim().toLowerCase();
  const contractInput = body?.contract;
  if (!email || !contractInput) return json({ error: 'contract and email required' }, 400);

  try {
    const subscriber = await getSubscriber(email);
    if (!subscriber || subscriber.status !== 'active') {
      return json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' }, 403);
    }

    const business = getBusinessProfile(subscriber);
    const contract = getContractProfile(contractInput);
    const prompt = buildPrompt(business, contract);

    let provider = 'openai';
    let analysis;

    try {
      analysis = await callOpenAI(prompt);
      if (!analysis) throw new Error('OpenAI API key is unavailable');
    } catch (openAIError) {
      console.warn('[contract-fit] OpenAI unavailable, attempting Anthropic:', openAIError.message);
      provider = 'anthropic';
      analysis = await callAnthropic(prompt);
      if (!analysis) throw openAIError;
    }

    validateSections(analysis);
    const decision = calculateDecision(analysis);

    return json({
      ok: true,
      provider,
      fitScore: decision.fitScore,
      recommendation: decision.recommendation,
      componentScores: decision.componentScores,
      hardStops: decision.hardStops,
      verificationItems: Array.isArray(analysis.verificationItems) ? analysis.verificationItems : [],
      sections: Object.fromEntries(
        Array.from({ length: 14 }, (_, i) => [`s${i + 1}`, analysis[`s${i + 1}`]])
      ),
      contract,
      generatedAt: new Date().toISOString(),
      methodologyVersion: 'CA-CFI-1.0',
      disclaimer: 'Educational contract-readiness analysis only. Verify all solicitation requirements with the issuing agency and qualified professionals before bidding.',
    });
  } catch (err) {
    console.error('[ngcc-analyze-fit]', err.message);
    return json({
      error: 'Analysis failed. Please try again.',
      detail: err.message,
    }, 500);
  }
};

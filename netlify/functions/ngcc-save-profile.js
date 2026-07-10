// NGCC — Save subscriber profile + return session
// Called at end of onboarding after NAICS confirmation.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function sbH() {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch(_) { return json({ error: 'Invalid request body' }, 400); }

  const { email, entity_name, uei, naics_codes, keywords, stripe_customer_id } = body;

  if (!email || !naics_codes?.length) {
    return json({ ok: false, error: 'email and naics_codes are required' }, 400);
  }

  try {
    // Update subscriber profile
    await fetch(
      `${SB_URL}/rest/v1/ngcc_subscribers?email=eq.${encodeURIComponent(email.toLowerCase())}`,
      {
        method: 'PATCH',
        headers: sbH(),
        body: JSON.stringify({
          entity_name:   entity_name || '',
          uei:           uei || '',
          naics_codes:   naics_codes,
          keywords:      keywords || [],
          onboarded:     true,
          updated_at:    new Date().toISOString(),
        })
      }
    );

    // Fetch updated record
    const subRes = await fetch(
      `${SB_URL}/rest/v1/ngcc_subscribers?email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
      { headers: sbH() }
    );
    const subs = await subRes.json();
    const sub  = Array.isArray(subs) ? subs[0] : {};

    const session = {
      email:                  email.toLowerCase(),
      business_name:          entity_name || sub.entity_name || '',
      entity_name:            entity_name || sub.entity_name || '',
      uei:                    uei || sub.uei || '',
      naics_codes,
      keywords:               keywords || [],
      tier:                   sub.tier || 'discovery',
      stripe_customer_id:     stripe_customer_id || sub.stripe_customer_id || '',
      signed_in_at:           new Date().toISOString(),
    };

    return json({ ok: true, session });

  } catch (err) {
    console.error('[ngcc-save-profile]', err.message);
    return json({ ok: false, error: 'Could not save your profile. Please try again.' }, 500);
  }
};

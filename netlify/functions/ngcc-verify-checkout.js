// NGCC — Verify Stripe checkout session post-purchase
// Called from onboarding.html after Stripe redirects with ?session_id=
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SB_URL     = process.env.SUPABASE_URL;
const SB_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  try { body = await req.json(); } catch(_) { return json({ error: 'Invalid request' }, 400); }

  const sessionId = body.session_id;
  if (!sessionId) return json({ ok: false, error: 'session_id required' }, 400);

  try {
    // Retrieve Stripe checkout session
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
    );
    const session = await stripeRes.json();

    if (!stripeRes.ok || session.payment_status !== 'paid') {
      return json({ ok: false, error: 'Payment not confirmed.' }, 402);
    }

    const email      = (session.customer_email || session.customer_details?.email || '').toLowerCase();
    const customerId = session.customer || '';
    const subId      = session.subscription || '';

    if (!email) return json({ ok: false, error: 'No email found on checkout session.' }, 400);

    // Upsert subscriber record
    await fetch(`${SB_URL}/rest/v1/ngcc_subscribers`, {
      method: 'POST',
      headers: { ...sbH(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        email,
        stripe_customer_id:     customerId,
        stripe_subscription_id: subId,
        status:                 'active',
        tier:                   'discovery',
        naics_codes:            [],
        keywords:               [],
        created_at:             new Date().toISOString(),
        updated_at:             new Date().toISOString(),
      })
    });

    return json({
      ok: true,
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
    });

  } catch (err) {
    console.error('[ngcc-verify-checkout]', err.message);
    return json({ ok: false, error: 'Could not verify payment. Please contact support.' }, 500);
  }
};

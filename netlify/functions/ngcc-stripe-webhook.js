// NGCC — Stripe Webhook Handler
// Keeps ngcc_subscribers.status in sync with Stripe subscription lifecycle.
//
// Events handled:
//   checkout.session.completed      → activate subscriber
//   customer.subscription.updated   → sync status
//   customer.subscription.deleted   → mark cancelled
//   invoice.payment_succeeded       → confirm active
//   invoice.payment_failed          → mark past_due
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// After deploying, register the webhook endpoint in Stripe:
//   Stripe Dashboard → Developers → Webhooks → Add endpoint
//   URL: https://ngcc.aproposgroupllc.com/.netlify/functions/ngcc-stripe-webhook
//   Events: checkout.session.completed, customer.subscription.*, invoice.payment_*

const STRIPE_KEY    = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SEC   = process.env.STRIPE_WEBHOOK_SECRET;
const SB_URL        = process.env.SUPABASE_URL;
const SB_KEY        = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbH() {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
}

async function sbPatch(filter, update) {
  const res = await fetch(`${SB_URL}/rest/v1/ngcc_subscribers?${filter}`, {
    method: 'PATCH', headers: sbH(), body: JSON.stringify(update)
  });
  return res.ok;
}

async function sbUpsert(row) {
  const res = await fetch(`${SB_URL}/rest/v1/ngcc_subscribers`, {
    method: 'POST',
    headers: { ...sbH(), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row)
  });
  return res.ok;
}

// Stripe signature verification (manual HMAC — no SDK needed)
async function verifySignature(body, sigHeader, secret) {
  const parts  = sigHeader.split(',');
  const ts     = parts.find(p => p.startsWith('t='))?.slice(2);
  const sig    = parts.find(p => p.startsWith('v1='))?.slice(3);
  if (!ts || !sig) return false;

  const payload  = `${ts}.${body}`;
  const key      = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2,'0')).join('');

  // Constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// Map Stripe subscription status → NGCC status
function mapStatus(stripeStatus) {
  const map = {
    active:             'active',
    trialing:           'active',
    past_due:           'past_due',
    canceled:           'cancelled',
    cancelled:          'cancelled',
    incomplete:         'incomplete',
    incomplete_expired: 'cancelled',
    unpaid:             'past_due',
    paused:             'paused',
  };
  return map[stripeStatus] || stripeStatus;
}

async function getCustomerEmail(customerId) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`,
      { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
    const c = await res.json();
    return (c.email || '').toLowerCase();
  } catch { return ''; }
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody  = await req.text();
  const sigHeader = req.headers.get('stripe-signature') || '';

  // Verify webhook signature
  if (WEBHOOK_SEC) {
    const valid = await verifySignature(rawBody, sigHeader, WEBHOOK_SEC);
    if (!valid) {
      console.warn('[ngcc-webhook] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch(_) { return new Response('Bad JSON', { status: 400 }); }

  const obj = event.data?.object || {};
  console.log(`[ngcc-webhook] ${event.type}`);

  try {
    switch (event.type) {

      // ── New subscription from checkout ────────────────────
      case 'checkout.session.completed': {
        const email = (obj.customer_email || obj.customer_details?.email || '').toLowerCase();
        if (!email) break;
        await sbUpsert({
          email,
          stripe_customer_id:     obj.customer     || '',
          stripe_subscription_id: obj.subscription || '',
          status:                 'active',
          tier:                   'discovery',
          naics_codes:            [],
          keywords:               [],
          updated_at:             new Date().toISOString(),
        });
        console.log(`[ngcc-webhook] Activated: ${email}`);
        break;
      }

      // ── Subscription status change ────────────────────────
      case 'customer.subscription.updated': {
        const status = mapStatus(obj.status);
        const email  = obj.customer ? await getCustomerEmail(obj.customer) : '';
        if (email) {
          await sbPatch(
            `stripe_customer_id=eq.${encodeURIComponent(obj.customer)}`,
            { status, stripe_subscription_id: obj.id, updated_at: new Date().toISOString() }
          );
          console.log(`[ngcc-webhook] Updated ${email} → ${status}`);
        }
        break;
      }

      // ── Subscription cancelled ────────────────────────────
      case 'customer.subscription.deleted': {
        await sbPatch(
          `stripe_customer_id=eq.${encodeURIComponent(obj.customer)}`,
          { status: 'cancelled', updated_at: new Date().toISOString() }
        );
        console.log(`[ngcc-webhook] Cancelled customer: ${obj.customer}`);
        break;
      }

      // ── Payment succeeded → ensure active ────────────────
      case 'invoice.payment_succeeded': {
        if (obj.billing_reason === 'subscription_create') break; // handled by checkout.session
        await sbPatch(
          `stripe_customer_id=eq.${encodeURIComponent(obj.customer)}`,
          { status: 'active', updated_at: new Date().toISOString() }
        );
        break;
      }

      // ── Payment failed → past_due ─────────────────────────
      case 'invoice.payment_failed': {
        await sbPatch(
          `stripe_customer_id=eq.${encodeURIComponent(obj.customer)}`,
          { status: 'past_due', updated_at: new Date().toISOString() }
        );
        console.log(`[ngcc-webhook] Payment failed: ${obj.customer}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[ngcc-webhook] Handler error for ${event.type}:`, err.message);
    // Return 200 so Stripe doesn't retry — log the error for investigation
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

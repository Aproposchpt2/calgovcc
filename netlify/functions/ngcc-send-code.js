// NGCC — Send OTP login code
// Checks for active subscriber, generates 6-digit OTP, emails it via Resend.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL

const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RS_KEY  = process.env.RESEND_API_KEY;
const RS_FROM = process.env.RESEND_FROM_EMAIL || 'NGCC <noreply@ai4businesses.org>';

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

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch(_) { return json({ error: 'Invalid request body' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Valid email required' }, 400);
  }

  // Check for active NGCC subscriber
  const subRes = await fetch(
    `${SB_URL}/rest/v1/ngcc_subscribers?email=eq.${encodeURIComponent(email)}&status=eq.active&limit=1`,
    { headers: sbH() }
  );
  const subs = await subRes.json();
  if (!Array.isArray(subs) || subs.length === 0) {
    return json({ ok: false, found: false });
  }

  const code    = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Delete any existing code for this email, then insert fresh
  await fetch(
    `${SB_URL}/rest/v1/ngcc_login_codes?email=eq.${encodeURIComponent(email)}`,
    { method: 'DELETE', headers: sbH() }
  );
  await fetch(`${SB_URL}/rest/v1/ngcc_login_codes`, {
    method: 'POST',
    headers: sbH(),
    body: JSON.stringify({ email, code, expires_at: expires, used: false })
  });

  // Send email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RS_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    RS_FROM,
      to:      [email],
      subject: 'Your NGCC login code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0F2A6A;color:#fff">
          <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:8px">National Government Contract Center</div>
          <h2 style="font-size:1.5rem;font-weight:400;margin:0 0 20px">Your login code</h2>
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
            <div style="font-size:2.4rem;font-weight:700;letter-spacing:.4em;color:#fff">${code}</div>
            <div style="font-size:.78rem;color:rgba(255,255,255,.4);margin-top:8px">Expires in 10 minutes</div>
          </div>
          <p style="font-size:.86rem;color:rgba(255,255,255,.5);line-height:1.6">Enter this code on the NGCC login page. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:24px 0"/>
          <p style="font-size:.72rem;color:rgba(255,255,255,.3)">National Government Contract Center &middot; Apropos Group LLC</p>
        </div>`
    })
  });

  return json({ ok: true, found: true });
};

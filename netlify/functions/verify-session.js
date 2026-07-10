// verify-session.js  |  StateGen — Session Token Verification
// Called by the frontend before rendering any protected page.
// POST body: { token: "<base64 signed session token>" }
// Returns: { ok: true, member: { email, exp } } or { ok: false }

const crypto = require('crypto');

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function verifyToken(token) {
  const SECRET = process.env.BC_VERIFY_SECRET;
  if (!SECRET) throw new Error('BC_VERIFY_SECRET not configured');

  // Decode base64 wrapper
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'malformed_token' };
  }

  const { payload, sig } = parsed;
  if (!payload || !sig) return { valid: false, reason: 'missing_fields' };

  // Recompute HMAC — constant-time compare prevents timing attacks
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  const sigMatch = crypto.timingSafeEqual(
    Buffer.from(sig,      'hex'),
    Buffer.from(expected, 'hex')
  );

  if (!sigMatch) return { valid: false, reason: 'invalid_signature' };

  // Parse payload
  let data;
  try { data = JSON.parse(payload); } catch {
    return { valid: false, reason: 'bad_payload' };
  }

  // Check expiry
  if (!data.exp || Date.now() > data.exp) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, member: { email: data.email, exp: data.exp } };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  const SECRET = process.env.BC_VERIFY_SECRET;
  if (!SECRET) {
    console.error('[verify-session] BC_VERIFY_SECRET is not set');
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Auth not configured' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Invalid request body' }),
    };
  }

  const { token } = body;
  if (!token) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'No token provided' }),
    };
  }

  const result = verifyToken(token);

  if (!result.valid) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: result.reason }),
    };
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, member: result.member }),
  };
};
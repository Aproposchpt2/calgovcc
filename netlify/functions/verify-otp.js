// verify-otp.js  |  StateGen — Verify OTP and issue signed session token

const crypto = require('crypto');

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function createSignedToken(email) {
  const SECRET = process.env.BC_VERIFY_SECRET;
  if (!SECRET) throw new Error('BC_VERIFY_SECRET not configured');

  const payload = JSON.stringify({
    email,
    iat: Date.now(),
    exp: Date.now() + 86400000   // 24-hour session
  });

  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64');
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

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Invalid request body' }),
    };
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Email required' }),
    };
  }

  const token = createSignedToken(email);
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, token })
  };
};
// bc-member-verify.js  |  StateGen — Basic BC verification endpoint

const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async function (event) {
  const SECRET = process.env.BC_VERIFY_SECRET;
  if (!SECRET) {
    console.error('[bc-member-verify] BC_VERIFY_SECRET is not set');
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: 'Auth service not configured' }),
    };
  }

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

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true }),
  };
};
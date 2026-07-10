// NGCC — SAM.gov Opportunities Search
// Queries live federal contract opportunities matching the subscriber's NAICS codes.
// SAM.gov Opportunities API v2: https://api.sam.gov/opportunities/v2/search
// Env: SAM_API_KEY

const SAM_BASE = 'https://api.sam.gov/opportunities/v2/search';
const SAM_KEY  = process.env.SAM_API_KEY;

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type, Authorization',
  'Cache-Control':               'public, max-age=300',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function daysFromNow(d) {
  return Math.ceil((new Date(d) - new Date()) / 864e5);
}

function urgency(deadline) {
  if (!deadline) return 'ok';
  const d = daysFromNow(deadline);
  if (d < 0)  return 'expired';
  if (d <= 7)  return 'hot';
  if (d <= 14) return 'warm';
  return 'ok';
}

function formatDate(mmddyyyy) {
  const [m, d, y] = String(mmddyyyy || '').split('/');
  return (y && m && d) ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : null;
}

function postedFromDate(daysBack = 90) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function mapOpportunity(o) {
  const deadline = formatDate(o.responseDeadLine) || o.responseDeadLine || null;
  return {
    noticeId:        o.noticeId         || o.solicitationNumber || '',
    title:           o.title            || 'Untitled Opportunity',
    agency:          o.organizationName || o.department || '',
    naicsCode:       o.naicsCode        || '',
    setAside:        o.typeOfSetAside   || o.setAside || '',
    responseDeadline: deadline,
    urgency:         urgency(deadline),
    postedDate:      formatDate(o.postedDate) || o.postedDate || null,
    description:     (o.description    || '').slice(0, 300),
    samUrl:          o.uiLink           || `https://sam.gov/opp/${o.noticeId}/view`,
    type:            o.type             || 'Solicitation',
    active:          o.active,
  };
}

async function fetchForNaics(naicsCode, limit = 25) {
  const today = new Date();
  const params = new URLSearchParams({
    api_key:    SAM_KEY,
    naicsCode:  naicsCode,
    active:     'Yes',
    limit:      String(limit),
    postedFrom: postedFromDate(90),
    postedTo:   `${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getDate().toString().padStart(2,'0')}/${today.getFullYear()}`,
  });

  const res = await fetch(`${SAM_BASE}?${params.toString()}`);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SAM ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.opportunitiesData || []).map(mapOpportunity);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS });

  if (!SAM_KEY) return json({ error: true, message: 'SAM API key not configured', results: [] }, 500);

  const q = new URL(req.url).searchParams;
  const naicsParam = q.get('naics') || '';
  const limit      = Math.min(parseInt(q.get('limit') || '50'), 200);

  if (!naicsParam) return json({ error: true, message: 'naics parameter required', results: [] }, 400);

  const naicsCodes = naicsParam.split(',').map(n => n.trim()).filter(Boolean).slice(0, 10);

  try {
    // Fetch for all NAICS codes in parallel, deduplicate by noticeId
    const perCode = Math.max(10, Math.floor(limit / naicsCodes.length));
    const batches  = await Promise.all(naicsCodes.map(n => fetchForNaics(n, perCode).catch(e => { console.error('[sam-opportunities] NAICS', n, e.message); return []; })));

    const seen = new Set();
    const results = [];
    for (const batch of batches) {
      for (const opp of batch) {
        if (opp.urgency === 'expired') continue;
        if (seen.has(opp.noticeId)) continue;
        seen.add(opp.noticeId);
        results.push(opp);
      }
    }

    // Sort: hot first → warm → ok, then by deadline ascending
    results.sort((a, b) => {
      const order = { hot: 0, warm: 1, ok: 2 };
      const diff  = (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
      if (diff !== 0) return diff;
      if (a.responseDeadline && b.responseDeadline) return new Date(a.responseDeadline) - new Date(b.responseDeadline);
      return 0;
    });

    return json({
      ok:          true,
      naicsCodes,
      total:       results.length,
      returned:    Math.min(results.length, limit),
      generatedAt: new Date().toISOString(),
      results:     results.slice(0, limit),
    });

  } catch (err) {
    console.error('[sam-opportunities]', err.message);
    return json({ error: true, message: err.message, results: [] }, 200);
  }
};

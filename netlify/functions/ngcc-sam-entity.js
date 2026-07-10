// NGCC — SAM.gov Entity Lookup
// Finds a registered federal contractor by business name and returns their NAICS codes.
// SAM.gov Entity Information API v3
// Env: SAM_API_KEY

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';
const SAM_KEY  = process.env.SAM_API_KEY;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function extractNaics(entity) {
  const gs       = entity.assertions?.goodsAndServices || {};
  const naicsList = gs.naicsList || [];
  return naicsList.map(n => ({
    naicsCode:        n.naicsCode || '',
    naicsDescription: n.naicsDescription || '',
    isPrimary:        n.isPrimary === true || n.isPrimary === 'Y',
    sbaSmallBusiness: n.sbaSmallBusiness || '',
  })).filter(n => n.naicsCode);
}

function mapEntity(entity) {
  const reg  = entity.entityRegistration || {};
  const core = entity.coreData || {};
  const addr = core.physicalAddress || core.mailingAddress || {};
  return {
    ueiSAM:           reg.ueiSAM || '',
    legalBusinessName: reg.legalBusinessName || reg.entityName || '',
    cageCode:         reg.cageCode || '',
    registrationStatus: reg.registrationStatus || '',
    entityType:       reg.entityType || '',
    state:            addr.stateOrProvinceCode || '',
    city:             addr.city || '',
    naicsList:        extractNaics(entity),
  };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!SAM_KEY) return json({ error: true, error: 'SAM API key not configured' }, 500);

  let body;
  try { body = await req.json(); } catch(_) { return json({ error: 'Invalid request body' }, 400); }

  const entityName = (body.entityName || '').trim();
  if (!entityName) return json({ ok: false, error: 'entityName is required' }, 400);

  try {
    const params = new URLSearchParams({
      api_key:            SAM_KEY,
      entityName:         entityName,
      registrationStatus: 'A',
      includeSections:    'entityRegistration,coreData,assertions',
      size:               '5',
    });

    const res  = await fetch(`${SAM_BASE}?${params.toString()}`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`SAM ${res.status}: ${t.slice(0, 200)}`);
    }

    const data     = await res.json();
    const entities = (data.entityData || []).map(e => mapEntity(e));

    if (!entities.length) {
      return json({
        ok:      false,
        error:   `No active SAM.gov registration found for "${entityName}". Check the exact legal name on your SAM.gov registration.`,
        results: [],
      });
    }

    // Return the best match (exact name match preferred, otherwise first result)
    const exact = entities.find(e =>
      e.legalBusinessName.toLowerCase() === entityName.toLowerCase()
    ) || entities[0];

    return json({
      ok:      true,
      entity:  exact,
      results: entities,
    });

  } catch (err) {
    console.error('[ngcc-sam-entity]', err.message);
    return json({ ok: false, error: err.message }, 200);
  }
};

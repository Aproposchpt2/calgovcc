// ─────────────────────────────────────────────────────────────────────────────
// ngem-pipeline.js  |  StateGen Nevada — NGEM Procurement Pipeline
// Netlify Serverless Function
//
// Architecture: Live POST scrape against the Nevada Government eMarketplace
// (NGEM) RadGrid at nevada.ionwave.net. Parses vendor opportunity rows from
// HTML + extracts BidIDs from RadGrid ClientState JSON. Filters closed/past
// bids, sorts by deadline, and returns a CORS-safe JSON response with a
// 5-minute CDN cache. Falls back to sample data if NGEM is unreachable.
//
// Response schema per bid:
// { id, bid_id, solicitation_no, title, bid_type, agency,
//   issue_date, close_date, daysToClose, url, status }
//
// Endpoint: /.netlify/functions/ngem-pipeline
// ─────────────────────────────────────────────────────────────────────────────

// ── CORS + Cache headers ──────────────────────────────────────────────────────
const HEADERS = {
  'Content-Type':                 'application/json',
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, max-age=300, s-maxage=300',
};

// ── NGEM target ───────────────────────────────────────────────────────────────
const NGEM_URL       = 'https://nevada.ionwave.net/VendorOpportunities.aspx';
const NGEM_DETAIL    = 'https://nevada.ionwave.net/PublicDetail.aspx?bidID=';
const FETCH_TIMEOUT  = 12000; // ms

// ── Sample fallback data ──────────────────────────────────────────────────────
const SAMPLE_BIDS = [
  {
    id:             'SAMPLE-NV-001',
    bid_id:         '00000',
    solicitation_no: 'DEMO-NV-001',
    title:          'Sample — Landscape Maintenance Services',
    bid_type:       'IFB',
    agency:         'City of Las Vegas',
    issue_date:     new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    close_date:     new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    daysToClose:    6,
    url:            NGEM_DETAIL + '00000',
    status:         'sample',
  },
  {
    id:             'SAMPLE-NV-002',
    bid_id:         '00001',
    solicitation_no: 'DEMO-NV-002',
    title:          'Sample — IT Infrastructure & Support Services',
    bid_type:       'RFP',
    agency:         'Clark County',
    issue_date:     new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    close_date:     new Date(Date.now() + 11 * 86400000).toISOString().split('T')[0],
    daysToClose:    11,
    url:            NGEM_DETAIL + '00001',
    status:         'sample',
  },
  {
    id:             'SAMPLE-NV-003',
    bid_id:         '00002',
    solicitation_no: 'DEMO-NV-003',
    title:          'Sample — Janitorial Services — Annual Contract',
    bid_type:       'RFQ',
    agency:         'Nevada Department of Transportation',
    issue_date:     new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    close_date:     new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    daysToClose:    14,
    url:            NGEM_DETAIL + '00002',
    status:         'sample',
  },
];

// ── Utility: days between today and a date string ─────────────────────────────
function dueInDays(dateStr) {
  if (!dateStr) return null;
  const close = new Date(dateStr);
  if (isNaN(close)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((close - today) / 86400000);
}

// ── Parse NGEM HTML: extract bid rows from the vendor opportunities table ──────
function parseBids(html) {
  const bids = [];

  // ── Step 1: Extract BidIDs from RadGrid ClientState JSON ───────────────────
  // NGEM stores BidIDs in a hidden field that contains serialized RadGrid state
  const bidIdMap = {};
  const clientStateMatch = html.match(
    /ClientState[^>]*value="([^"]{20,})"/
  );
  if (clientStateMatch) {
    try {
      const state = JSON.parse(decodeURIComponent(clientStateMatch[1]));
      const groups = state?.VirtualItemCount
        ? state
        : (state?.GroupsClientDataSource || state);
      // Walk item keys to find bidID mappings
      const itemsStr = JSON.stringify(groups);
      const bidIdMatches = [...itemsStr.matchAll(/"bidID"\s*:\s*"?(\d+)"?/gi)];
      bidIdMatches.forEach((m, i) => { bidIdMap[i] = m[1]; });
    } catch (_) { /* ClientState not parseable — continue without deep links */ }
  }

  // ── Step 2: Parse table rows ────────────────────────────────────────────────
  // Each opportunity row contains: bid number, title, type, org, issue, close
  const rowRe = /<tr[^>]*class="[^"]*(?:rgRow|rgAltRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const tagRe  = /<[^>]+>/g;

  let rowMatch;
  let rowIndex = 0;

  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells   = [];
    let cellMatch;

    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(tagRe, '').trim());
    }

    // NGEM row columns: [0] Bid#, [1] Title, [2] Type, [3] Org, [4] Issue, [5] Close
    if (cells.length >= 5) {
      const bidId      = bidIdMap[rowIndex] || '';
      const daysToClose = dueInDays(cells[5] || cells[4]);

      bids.push({
        id:              `NV-${rowIndex + 1}`,
        bid_id:          bidId,
        solicitation_no: cells[0] || '',
        title:           cells[1] || '',
        bid_type:        cells[2] || '',
        agency:          cells[3] || '',
        issue_date:      cells[4] || '',
        close_date:      cells[5] || cells[4] || '',
        daysToClose:     daysToClose,
        url:             bidId ? `${NGEM_DETAIL}${bidId}` : NGEM_URL,
        status:          'live',
      });

      rowIndex++;
    }
  }

  return bids;
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async function (event) {

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  let bids     = [];
  let scanMode = 'live';

  // ── Fetch live NGEM data ───────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(NGEM_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StateGen-NV/2.0; +https://stategen.aproposgroupllc.com)',
        'Accept':     'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timer);

    if (!resp.ok) throw new Error(`NGEM responded ${resp.status}`);

    const html = await resp.text();
    bids       = parseBids(html);
    scanMode   = 'live';

  } catch (err) {
    console.warn('[ngem-pipeline] Live fetch failed — falling back to sample data:', err.message);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        source:      'ngem',
        state:       'NV',
        scanMode:    'sample',
        generatedAt: new Date().toISOString(),
        count:       SAMPLE_BIDS.length,
        bids:        SAMPLE_BIDS,
      }),
    };
  }

  // ── Filter: only open, future bids ────────────────────────────────────────
  const filtered = bids
    .filter(b => b.daysToClose === null || b.daysToClose >= 0)
    .sort((a, b) => (a.daysToClose ?? 9999) - (b.daysToClose ?? 9999));

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      source:      'ngem',
      state:       'NV',
      scanMode:    scanMode,
      generatedAt: new Date().toISOString(),
      count:       filtered.length,
      bids:        filtered,
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// cal-pipeline.js  |  CalStateGen — California Procurement Pipeline
// Netlify Serverless Function
//
// Architecture: Reads bids.json from repo root (populated daily by GitHub
// Actions Playwright scraper targeting PlanetBids portals across CA agencies).
// Normalizes field naming, filters cancelled/expired bids, sorts by deadline,
// and returns a CORS-safe JSON response with a 5-minute CDN cache.
//
// Response schema per bid:
// { id, solicitation_no, title, bid_type, agency, close_date,
//   daysToClose, url, status }
//
// Endpoint: /.netlify/functions/cal-pipeline
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

// ── CORS + Cache headers ──────────────────────────────────────────────────────
const HEADERS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':               'public, max-age=300, s-maxage=300',
};

// ── Sample fallback (returned if bids.json is missing or unreadable) ──────────
const SAMPLE_BIDS = [
  {
    id: 'CA-001', solicitation_no: 'DGS-2026-IT-0091',
    title: 'Enterprise Software Licensing and Implementation Services',
    bid_type: 'RFP', agency: 'California Dept of General Services',
    close_date: new Date(Date.now() + 8 * 86400000).toISOString(),
    daysToClose: 8, due_in_days: 8, url: 'https://caleprocure.ca.gov', status: 'live',
  },
  {
    id: 'CA-002', solicitation_no: 'LACOE-2026-044',
    title: 'AI Automation and Workflow Integration Services',
    bid_type: 'RFP', agency: 'Los Angeles County Office of Education',
    close_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    daysToClose: 14, due_in_days: 14, url: 'https://vendors.planetbids.com', status: 'live',
  },
  {
    id: 'CA-003', solicitation_no: 'SFMTA-2026-0211',
    title: 'CRM System Implementation and Data Migration',
    bid_type: 'RFP', agency: 'City and County of San Francisco',
    close_date: new Date(Date.now() + 21 * 86400000).toISOString(),
    daysToClose: 21, due_in_days: 21, url: 'https://vendors.planetbids.com', status: 'live',
  },
  {
    id: 'CA-004', solicitation_no: 'UCLA-2026-PROC-88',
    title: 'Managed IT Services and Network Infrastructure Support',
    bid_type: 'RFQ', agency: 'University of California, Los Angeles',
    close_date: new Date(Date.now() + 11 * 86400000).toISOString(),
    daysToClose: 11, due_in_days: 11, url: 'https://caleprocure.ca.gov', status: 'live',
  },
  {
    id: 'CA-005', solicitation_no: 'SDCCD-2026-IT-019',
    title: 'Software Development and Application Support Services',
    bid_type: 'RFP', agency: 'San Diego Community College District',
    close_date: new Date(Date.now() + 6 * 86400000).toISOString(),
    daysToClose: 6, due_in_days: 6, url: 'https://vendors.planetbids.com', status: 'live',
  },
  {
    id: 'CA-006', solicitation_no: 'SAC-2026-TECH-033',
    title: 'Business Process Automation and API Integration',
    bid_type: 'RFQ', agency: 'City of Sacramento',
    close_date: new Date(Date.now() + 18 * 86400000).toISOString(),
    daysToClose: 18, due_in_days: 18, url: 'https://vendors.planetbids.com', status: 'live',
  },
  {
    id: 'CA-007', solicitation_no: 'CALTRANS-2026-0044',
    title: 'Roadway Maintenance and Paving Services — District 7',
    bid_type: 'IFB', agency: 'California Dept of Transportation',
    close_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    daysToClose: 5, due_in_days: 5, url: 'https://caleprocure.ca.gov', status: 'live',
  },
  {
    id: 'CA-008', solicitation_no: 'LAUSD-2026-FAC-011',
    title: 'Janitorial and Custodial Services — Annual Contract',
    bid_type: 'IFB', agency: 'Los Angeles Unified School District',
    close_date: new Date(Date.now() + 9 * 86400000).toISOString(),
    daysToClose: 9, due_in_days: 9, url: 'https://vendors.planetbids.com', status: 'live',
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async function (event) {

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  let rawBids = [];
  let scanMode = 'live';

  // ── Read bids.json (deployed with the site from repo root) ─────────────────
  try {
    // In Netlify Functions, the repo root is two levels up from netlify/functions/
    const bidsPath = path.resolve(__dirname, '../../bids.json');
    const raw      = fs.readFileSync(bidsPath, 'utf-8');
    const parsed   = JSON.parse(raw);
    rawBids        = Array.isArray(parsed.bids) ? parsed.bids : [];
    scanMode       = parsed.scanMode || 'live';
  } catch (err) {
    console.error('[cal-pipeline] bids.json read error:', err.message);
    // Fall through to sample data
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        source:      'planetbids',
        state:       'CA',
        scanMode:    'sample',
        generatedAt: new Date().toISOString(),
        count:       SAMPLE_BIDS.length,
        bids:        SAMPLE_BIDS,
      }),
    };
  }

  // ── Normalize + compute daysToClose ────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bids = rawBids
    .map(b => {
      // Rename due_in_days → daysToClose; support both field names during migration
      const daysToClose = b.daysToClose !== undefined
        ? b.daysToClose
        : b.due_in_days !== undefined
          ? b.due_in_days
          : (() => {
              if (!b.close_date) return null;
              const close = new Date(b.close_date);
              return isNaN(close) ? null : Math.ceil((close - today) / 86400000);
            })();

      return {
        id:             String(b.id || ''),
        solicitation_no: b.solicitation_no || '',
        title:          b.title           || '',
        bid_type:       b.bid_type        || '',
        agency:         b.agency          || '',
        close_date:     b.close_date      || '',
        daysToClose:    daysToClose,
        due_in_days:    daysToClose,
        url:            b.url             || 'https://vendors.planetbids.com',
        status:         'live',
      };
    })
    // Filter: remove cancelled bids and bids that have already closed
    .filter(b => {
      if (b.bid_type && b.bid_type.toLowerCase() === 'canceled') return false;
      if (b.daysToClose === null) return false;       // no close date — exclude
      if (b.daysToClose < 0)     return false;        // already closed
      if (b.daysToClose > 730)   return false;        // "continuous" rolling bids — exclude
      return true;
    })
    // Sort: soonest deadline first
    .sort((a, b) => (a.daysToClose ?? 9999) - (b.daysToClose ?? 9999));

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      source:      'planetbids',
      state:       'CA',
      scanMode:    scanMode,
      generatedAt: new Date().toISOString(),
      count:       bids.length,
      bids:        bids,
    }),
  };
};

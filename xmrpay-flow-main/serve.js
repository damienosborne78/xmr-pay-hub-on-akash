import { serve, file } from 'bun';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Data directory ───
const DATA_DIR = join(import.meta.dir, 'data');
const CODES_FILE = join(DATA_DIR, 'pro-codes.json');
const REFERRAL_FILE = join(DATA_DIR, 'referral-telemetry.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── JSON helpers ───
function loadJSON(path) {
  try { if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8')); } catch {}
  return path === REFERRAL_FILE ? {} : [];
}
function saveJSON(path, data) { writeFileSync(path, JSON.stringify(data, null, 2)); }

function loadCodes() { return loadJSON(CODES_FILE); }
function saveCodes(codes) { saveJSON(CODES_FILE, codes); }
function loadReferrals() { return loadJSON(REFERRAL_FILE); }
function saveReferrals(data) { saveJSON(REFERRAL_FILE, data); }

// ─── Input validation ───
function isValidReferralCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{4,12}$/i.test(code);
}

// ─── CORS headers ───
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ─── API routes ───

    // Health check
    if (pathname === '/api/mf/health') {
      return json({ ok: true, ts: Date.now() });
    }

    // ── Pro Codes ──

    if (pathname === '/api/mf/codes' && req.method === 'GET') {
      return json(loadCodes());
    }

    if (pathname === '/api/mf/codes/create' && req.method === 'POST') {
      const body = await req.json();
      if (!body.code) return json({ error: 'Missing code' }, 400);
      const codes = loadCodes();
      if (codes.find(c => c.code === body.code)) return json({ error: 'Duplicate' }, 409);
      codes.push({ code: body.code, createdAt: body.createdAt || new Date().toISOString(), usedBy: null });
      saveCodes(codes);
      return json({ ok: true, code: body.code });
    }

    if (pathname === '/api/mf/codes/validate' && req.method === 'POST') {
      const body = await req.json();
      const code = (body.code || '').toUpperCase();
      const codes = loadCodes();
      const entry = codes.find(c => c.code === code);
      if (!entry) return json({ valid: false, reason: 'not_found' });
      if (entry.usedBy) return json({ valid: false, reason: 'already_used' });
      return json({ valid: true, code: entry.code });
    }

    if (pathname === '/api/mf/codes/redeem' && req.method === 'POST') {
      const body = await req.json();
      const code = (body.code || '').toUpperCase();
      const codes = loadCodes();
      const idx = codes.findIndex(c => c.code === code);
      if (idx === -1) return json({ ok: false, reason: 'not_found' }, 404);
      if (codes[idx].usedBy) return json({ ok: false, reason: 'already_used' }, 409);
      codes[idx].usedBy = body.redeemedBy || 'unknown';
      codes[idx].redeemedAt = new Date().toISOString();
      saveCodes(codes);
      return json({ ok: true });
    }

    // ── Referral Telemetry ──

    // POST /api/mf/referral/sync — upsert referral data keyed by referralCode
    if (pathname === '/api/mf/referral/sync' && req.method === 'POST') {
      try {
        const body = await req.json();
        const code = body.referralCode;
        if (!isValidReferralCode(code)) {
          return json({ error: 'Invalid or missing referralCode' }, 400);
        }
        const db = loadReferrals();
        db[code] = {
          referralCode: code,
          proCode: body.proCode || null,
          referredBy: body.referredBy || null,
          proStatus: body.proStatus || 'free',
          proActivatedAt: body.proActivatedAt || null,
          referrals: Array.isArray(body.referrals) ? body.referrals.slice(0, 500) : [],
          referralPayouts: Array.isArray(body.referralPayouts) ? body.referralPayouts.slice(0, 500) : [],
          lastSyncAt: body.lastSyncAt || new Date().toISOString(),
          serverReceivedAt: new Date().toISOString(),
        };
        saveReferrals(db);
        return json({ ok: true, code });
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }
    }

    // GET /api/mf/referral/sync?code=ABC123 — retrieve a user's synced data
    if (pathname === '/api/mf/referral/sync' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code || !isValidReferralCode(code)) {
        return json({ error: 'Missing or invalid code param' }, 400);
      }
      const db = loadReferrals();
      const entry = db[code] || null;
      if (!entry) return json({ error: 'not_found' }, 404);
      return json(entry);
    }

    // GET /api/mf/referral/all — list all synced referral users (admin/debug)
    if (pathname === '/api/mf/referral/all' && req.method === 'GET') {
      return json(loadReferrals());
    }

    // ─── Static file serving ───
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const fullPath = join(import.meta.dir, 'dist', filePath);

    if (existsSync(fullPath)) {
      return new Response(file(fullPath));
    }

    // SPA fallback
    return new Response(file(join(import.meta.dir, 'dist', 'index.html')));
  },
});

console.log('MoneroFlow server running on http://localhost:3001');

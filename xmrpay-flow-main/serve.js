import { serve, file } from 'bun';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Pro Codes JSON persistence ───
const DATA_DIR = join(import.meta.dir, 'data');
const CODES_FILE = join(DATA_DIR, 'pro-codes.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadCodes() {
  try {
    if (existsSync(CODES_FILE)) return JSON.parse(readFileSync(CODES_FILE, 'utf-8'));
  } catch {}
  return [];
}

function saveCodes(codes) {
  writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
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

    // List all codes (used by Master Access to show codes)
    if (pathname === '/api/mf/codes' && req.method === 'GET') {
      return json(loadCodes());
    }

    // Create a new pro code
    if (pathname === '/api/mf/codes/create' && req.method === 'POST') {
      const body = await req.json();
      if (!body.code) return json({ error: 'Missing code' }, 400);
      const codes = loadCodes();
      // Prevent duplicates
      if (codes.find(c => c.code === body.code)) return json({ error: 'Duplicate' }, 409);
      codes.push({ code: body.code, createdAt: body.createdAt || new Date().toISOString(), usedBy: null });
      saveCodes(codes);
      return json({ ok: true, code: body.code });
    }

    // Validate a code (check if it exists and is unused) — used by new clients
    if (pathname === '/api/mf/codes/validate' && req.method === 'POST') {
      const body = await req.json();
      const code = (body.code || '').toUpperCase();
      const codes = loadCodes();
      const entry = codes.find(c => c.code === code);
      if (!entry) return json({ valid: false, reason: 'not_found' });
      if (entry.usedBy) return json({ valid: false, reason: 'already_used' });
      return json({ valid: true, code: entry.code });
    }

    // Redeem a code
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

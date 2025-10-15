// Minimal dynamic server for MyMcKenzie (no external dependencies)
// Usage:
//   node server/index.js
// Then open:
//   http://localhost:8000/
// or direct pages, e.g.:
//   http://localhost:8000/auth/user-signup.html

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Pool } = require('pg');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const ROOT = path.resolve(__dirname, '..'); // MyMckenzie-main

// Database config
const DEFAULT_DB_URL = 'postgres://postgres:Pentagon100@localhost:2003/postgres?sslmode=disable';
const DATABASE_URL = process.env.DATABASE_URL || DEFAULT_DB_URL;
let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL, ssl: false, max: 5 });
  }
  return pool;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function safeJoin(base, target) {
  const targetPath = path.posix.normalize('/' + target);
  return path.join(base, targetPath);
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    if (stats.isDirectory()) {
      // If directory, try index.html
      const indexPath = path.join(filePath, 'index.html');
      return serveFile(req, res, indexPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': type });
      stream.pipe(res);
    });
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    });
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method || 'GET';
  const pathname = parsed.pathname || '/';

  // Simple API routes to demonstrate dynamic behavior
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
  }
  if (pathname === '/api/db/health') {
    (async () => {
      try {
        const p = getPool();
        const r = await p.query('SELECT now() AS now');
        return sendJson(res, 200, { ok: true, now: r.rows[0].now, db: 'postgres' });
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: String(e && e.message || e) });
      }
    })();
    return;
  }
  if (pathname === '/api/echo' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { body = body ? JSON.parse(body) : {}; } catch { body = { raw: body }; }
      return sendJson(res, 200, { ok: true, received: body });
    });
    return;
  }

  // Serve the app files
  let relPath = pathname;
  if (relPath === '/' || relPath === '') relPath = '/index.html';

  const candidate = safeJoin(ROOT, relPath);
  // Prevent path traversal outside ROOT
  if (!candidate.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }
  serveFile(req, res, candidate);
});

server.listen(PORT, async () => {
  console.log(`MyMcKenzie dynamic server listening on http://localhost:${PORT}`);
  try {
    const p = getPool();
    const r = await p.query('SELECT now()');
    console.log('DB connected. Time:', r.rows[0].now);
  } catch (e) {
    console.warn('DB connection failed at startup:', e && e.message || e);
  }
});

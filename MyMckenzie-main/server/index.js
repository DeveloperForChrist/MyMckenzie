// Minimal dynamic server for MyMcKenzie using Firebase
// Run: node server/index.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json'); // Ensure this file exists with your service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://webbase-f259b.firebaseio.com', // Update with your Firebase project URL
  storageBucket: 'webbase-f259b.firebasestorage.app' // Update with your storage bucket
});

const auth = admin.auth();
const db = admin.firestore();

// ==========================
// Server configuration
// ==========================
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const ROOT = path.resolve(__dirname, '..');

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
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
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
      return serveFile(req, res, path.join(filePath, 'index.html'));
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

// ==========================
// Helpers
// ==========================
function readJsonBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Payload too large'));
        try { req.destroy(); } catch {}
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================
// HTTP server and routes
// ==========================
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method || 'GET';
  const pathname = parsed.pathname || '/';

  // Health
  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
  }

  // Echo
  if (pathname === '/api/echo' && method === 'POST') {
    readJsonBody(req)
      .then((body) => sendJson(res, 200, { ok: true, received: body }))
      .catch((err) => sendJson(res, 400, { error: err.message }));
    return;
  }

  // Signup (server-admin creates a Firebase Auth user)
  if (pathname === '/api/auth/signup' && method === 'POST') {
    (async () => {
      try {
        const data = await readJsonBody(req);
        const firstName = (data.firstName || '').toString().trim();
        const lastName = (data.lastName || '').toString().trim();
        const email = (data.email || '').toString().trim();
        const password = (data.password || '').toString();
        if (!firstName || !lastName || !email || !password) return sendJson(res, 400, { error: 'Missing required fields' });
        if (!isValidEmail(email)) return sendJson(res, 400, { error: 'Invalid email' });
        if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters' });

        const displayName = `${firstName} ${lastName}`.trim();

        const userRecord = await auth.createUser({
          email,
          password,
          displayName,
          emailVerified: true, // instantly confirm since this is an admin-created user
        });

        // Store additional user metadata in Firestore
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          firstName,
          lastName,
          displayName,
          email,
          role: 'user',
          accountType: 'user',
          provider: 'password',
          createdAt: new Date(),
        });

        return sendJson(res, 201, { ok: true, id: userRecord.uid, createdAt: userRecord.metadata.creationTime });
      } catch (err) {
        if (String(err).includes('Invalid JSON')) return sendJson(res, 400, { error: 'Invalid JSON' });
        if (String(err).includes('Payload too large')) return sendJson(res, 413, { error: 'Payload too large' });
        if (err.code === 'auth/email-already-exists') return sendJson(res, 409, { error: 'Email already registered' });
        return sendJson(res, 500, { error: 'Server error', detail: String(err) });
      }
    })();
    return;
  }

  // McKenzie Signup (server-admin creates a Firebase Auth user for McKenzie Friend)
  if (pathname === '/api/auth/mckenzie-signup' && method === 'POST') {
    (async () => {
      try {
        const data = await readJsonBody(req);
        const firstName = (data.firstName || '').toString().trim();
        const lastName = (data.lastName || '').toString().trim();
        const email = (data.email || '').toString().trim();
        const password = (data.password || '').toString();
        if (!firstName || !lastName || !email || !password) return sendJson(res, 400, { error: 'Missing required fields' });
        if (!isValidEmail(email)) return sendJson(res, 400, { error: 'Invalid email' });
        if (password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters' });

        const displayName = `${firstName} ${lastName}`.trim();

        const userRecord = await auth.createUser({
          email,
          password,
          displayName,
          emailVerified: true, // instantly confirm since this is an admin-created user
        });

        // Store additional user metadata in Firestore for McKenzie Friend
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          firstName,
          lastName,
          displayName,
          email,
          role: 'mckenzie',
          accountType: 'mckenzie',
          provider: 'password',
          createdAt: new Date(),
        });

        return sendJson(res, 201, { ok: true, id: userRecord.uid, createdAt: userRecord.metadata.creationTime });
      } catch (err) {
        if (String(err).includes('Invalid JSON')) return sendJson(res, 400, { error: 'Invalid JSON' });
        if (String(err).includes('Payload too large')) return sendJson(res, 413, { error: 'Payload too large' });
        if (err.code === 'auth/email-already-exists') return sendJson(res, 409, { error: 'Email already registered' });
        return sendJson(res, 500, { error: 'Server error', detail: String(err) });
      }
    })();
    return;
  }

  // Signin (verify credentials with Firebase Auth)
  if (pathname === '/api/auth/signin' && method === 'POST') {
    (async () => {
      try {
        const data = await readJsonBody(req);
        const email = (data.email || '').toString().trim();
        const password = (data.password || '').toString();
        if (!isValidEmail(email) || !password) return sendJson(res, 400, { error: 'Invalid credentials' });

        // Firebase Admin SDK doesn't support password sign-in directly
        // This would need to be handled on the client-side with Firebase Auth SDK
        // For server-side verification, you might need to use custom tokens or other methods
        return sendJson(res, 501, { error: 'Password sign-in not implemented for server-side. Use client-side Firebase Auth.' });
      } catch (err) {
        return sendJson(res, 500, { error: 'Server error', detail: String(err) });
      }
    })();
    return;
  }

  // DB diagnostics via Firebase
  if (pathname === '/api/db/health') {
    (async () => {
      try {
        // Simple Firestore connectivity check
        const testDoc = await db.collection('health').doc('check').get();
        return sendJson(res, 200, { status: 'ok' });
      } catch (err) {
        return sendJson(res, 500, { status: 'error', error: String(err.message || err) });
      }
    })();
    return;
  }

  if (pathname === '/api/db/version') {
    return sendJson(res, 200, { version: 'Firebase' });
  }

  if (pathname === '/api/db/time') {
    return sendJson(res, 200, { time: new Date().toISOString() });
  }

  if (pathname === '/api/db/diag') {
    (async () => {
      const result = {
        config: {
          firebaseProject: admin.app().options.projectId,
          hasServiceAccount: true,
        },
      };
      try {
        const usersSnapshot = await db.collection('users').limit(1).get();
        result.ok = true;
        result.sampleUsers = usersSnapshot.size;
        sendJson(res, 200, result);
      } catch (err) {
        result.ok = false;
        result.error = String(err.message || err);
        sendJson(res, 500, result);
      }
    })();
    return;
  }

  // Static files
  let relPath = pathname;
  if (relPath === '/' || relPath === '') relPath = '/index.html';
  const candidate = safeJoin(ROOT, relPath);
  if (!candidate.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }
  serveFile(req, res, candidate);
});

server.listen(PORT, () => {
  console.log(`MyMcKenzie dynamic server listening on http://localhost:${PORT}`);
  console.log('Using Firebase as the database.');
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL not set. Set it in server/.env or environment.');
}

const pool = new Pool({ connectionString: DATABASE_URL });
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');

const STACK_SECRET = process.env.STACK_SECRET_SERVER_KEY;
const STACK_PUBLISHABLE = process.env.STACK_PUBLISHABLE_CLIENT_KEY;
const STACK_PROJECT_ID = process.env.STACK_PROJECT_ID;
const STACK_BASE = process.env.STACK_BASE_URL || 'https://auth.stack.neon.tech';

// Helper: insert audit row
async function insertSignupAudit({ email, first_name, last_name, success, note }) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO signup_audit (email, first_name, last_name, success, note, created_at) VALUES ($1,$2,$3,$4,$5,now())',
      [email, first_name, last_name, success, note]
    );
  } finally { client.release(); }
}

// Minimal signup route
app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // write attempt audit
    await insertSignupAudit({ email, first_name: firstName, last_name: lastName, success: false, note: 'attempt' });

    if (STACK_SECRET) {
      // Try to create user via Neon Stack Auth
      try {
        const resp = await axios.post(`${STACK_BASE}/v1/signup`, {
          email,
          password,
          user_metadata: { firstName, lastName }
        }, { headers: { Authorization: `Bearer ${STACK_SECRET}` } });
        const payload = resp.data;
        const authId = payload?.user?.id || null;
        // upsert profile with returned auth id
        const client = await pool.connect();
        try {
          await client.query(
            `INSERT INTO users (auth_uid, email, first_name, last_name, role, created_at, updated_at)
              VALUES ($1,$2,$3,$4,$5,now(),now())
              ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, updated_at=now()`,
            [authId, email, firstName, lastName, 'user']
          );
        } finally { client.release(); }
        await insertSignupAudit({ email, first_name: firstName, last_name: lastName, success: true, note: 'neon_signup_success' });
        return res.json({ ok: true, message: 'Signup created via Neon Auth' });
      } catch (ne) {
        console.warn('Neon signup failed, falling back to local signup:', ne?.response?.data || ne.message);
        // fall through to local behavior
      }
    }

    // Local bcrypt-backed signup fallback
    const client = await pool.connect();
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      await client.query(
        `INSERT INTO users (auth_uid, email, first_name, last_name, password_hash, role, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,now(),now())
          ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, password_hash=EXCLUDED.password_hash, updated_at=now()`,
        [null, email, firstName, lastName, hash, 'user']
      );
    } finally { client.release(); }

    // success audit
    await insertSignupAudit({ email, first_name: firstName, last_name: lastName, success: true, note: 'server_signup_success' });

    return res.json({ ok: true, message: 'Signup processed. Integrate Neon Auth to create real auth users.' });
  } catch (err) {
    console.error('Signup error', err);
    try { await insertSignupAudit({ email, first_name: firstName, last_name: lastName, success: false, note: String(err).slice(0,255) }); } catch(e){}
    return res.status(500).json({ error: 'Signup failed', detail: String(err) });
  }
});

// Minimal signin route: validate email/password against users table (placeholder)
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  try {
    if (STACK_SECRET) {
      // Try authenticating via Neon Auth (Stack)
      try {
        const resp = await axios.post(`${STACK_BASE}/v1/token`, { grant_type: 'password', username: email, password }, { headers: { Authorization: `Bearer ${STACK_SECRET}` } });
        const data = resp.data;
        // token flow succeeded; return safe profile info (you may want to issue your own session cookie)
        const client = await pool.connect();
        try {
          const { rows } = await client.query('SELECT id,email,first_name,last_name,role,metadata,created_at,updated_at FROM users WHERE email = $1 LIMIT 1', [email]);
          const profile = rows && rows[0] ? rows[0] : null;
          return res.json({ ok: true, profile, token: data });
        } finally { client.release(); }
      } catch (ne) {
        console.warn('Neon signin failed, falling back to local signin:', ne?.response?.data || ne.message);
        // fall through to local behavior
      }
    }

    // Local bcrypt-backed signin fallback
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
      if (!rows || !rows.length) return res.status(401).json({ error: 'Invalid credentials' });
      const user = rows[0];
      const pwHash = user.password_hash;
      if (!pwHash) return res.status(401).json({ error: 'Invalid credentials' });
      const ok = bcrypt.compareSync(password, pwHash);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      delete user.password_hash;
      return res.json({ ok: true, profile: user });
    } finally { client.release(); }
  } catch (err) {
    console.error('Signin error', err);
    return res.status(500).json({ error: 'Signin failed', detail: String(err) });
  }
});

// Minimal reset-password: create a reset audit and return success (placeholder)
app.post('/api/reset-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });
  try {
    await insertSignupAudit({ email, first_name: null, last_name: null, success: false, note: 'password_reset_requested' });
    // Try Neon password reset if available
    if (STACK_SECRET) {
      try {
        const resp = await axios.post(`${STACK_BASE}/v1/admin/reset_password`, { email }, { headers: { Authorization: `Bearer ${STACK_SECRET}` } });
        // assume Neon handled email sending
        return res.json({ ok: true, message: 'Password reset requested via Neon Auth.' });
      } catch (ne) {
        console.warn('Neon reset failed, falling back to local reset:', ne?.response?.data || ne.message);
      }
    }

    // Local reset fallback
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
      if (!rows || !rows.length) return res.json({ ok: true, message: 'If the email exists, a reset email has been sent.' });
      const userId = rows[0].id;
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await client.query('INSERT INTO password_resets (user_id, token, expires_at, used, created_at) VALUES ($1,$2,$3,false,now())', [userId, token, expiresAt]);
      return res.json({ ok: true, message: 'Password reset token created (TEST ONLY).', token });
    } finally { client.release(); }
  } catch (err) {
    console.error('Reset error', err);
    return res.status(500).json({ error: 'Reset failed', detail: String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

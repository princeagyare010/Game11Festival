const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { statements } = require('../db');
const { signAdminToken, cookieOptions, requireAdmin, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME;
  const plainPassword = process.env.ADMIN_PASSWORD;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUser || (!plainPassword && !expectedHash)) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD are not configured in .env');
    return res.status(500).json({ error: 'Admin login is not configured yet.' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const usernameOk = username === expectedUser;
  let passwordOk = false;

  if (typeof plainPassword === 'string' && plainPassword.length > 0) {
    passwordOk = password === plainPassword;
  } else if (expectedHash) {
    // Fallback for legacy hashes in .env.
    passwordOk = await bcrypt.compare(password, expectedHash).catch(() => false);
  }

  if (!usernameOk || !passwordOk) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = signAdminToken(username);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  return res.json({ ok: true, username: req.admin.sub });
});

router.get('/registrations', requireAdmin, (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let rows = statements.all.all();

  if (search) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.phone.toLowerCase().includes(search) ||
        r.ref_code.toLowerCase().includes(search)
    );
  }

  return res.json({ ok: true, total: rows.length, registrations: rows });
});

router.get('/export.csv', requireAdmin, (req, res) => {
  const rows = statements.all.all();
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
  const header = ['Reference', 'Name', 'Email', 'Phone', 'Registered At'].map(escape).join(',');
  const lines = rows.map((r) =>
    [r.ref_code, r.name, r.email, r.phone, r.created_at].map(escape).join(',')
  );
  const csv = [header, ...lines].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="game11-registrations-${Date.now()}.csv"`);
  return res.send(csv);
});

router.delete('/registrations/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id.' });
  }
  const result = statements.deleteById.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.json({ ok: true });
});

module.exports = router;

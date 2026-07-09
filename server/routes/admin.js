const express = require('express');
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

  if (!expectedUser || !plainPassword) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD are not configured in .env');
    return res.status(500).json({ error: 'Admin login is not configured yet.' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const usernameOk = username === expectedUser;
  const passwordOk = typeof plainPassword === 'string' && plainPassword.length > 0 && password === plainPassword;

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

router.get('/registrations', requireAdmin, async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let rows = await statements.all.all();

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

router.get('/export.csv', requireAdmin, async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let rows = await statements.all.all();

  if (search) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.phone.toLowerCase().includes(search) ||
        r.ref_code.toLowerCase().includes(search)
    );
  }

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

router.get('/export.pdf', requireAdmin, async (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let rows = await statements.all.all();

  if (search) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search) ||
        r.phone.toLowerCase().includes(search) ||
        r.ref_code.toLowerCase().includes(search)
    );
  }

  const escapePdfText = (value) => String(value ?? '').replace(/[\\()]/g, '\\$&');
  const lines = [
    'Game 11 Festival — Registrations',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...(rows.length === 0 ? ['No registrations found.'] : []),
    ...rows.flatMap((r) => [
      `Reference: ${r.ref_code}`,
      `Name: ${r.name}`,
      `Email: ${r.email}`,
      `Phone: ${r.phone}`,
      `Registered: ${r.created_at}`,
      '',
    ]),
  ];

  const contentLines = lines.map((line, index) => `BT /F1 11 Tf 72 ${760 - index * 13} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length 0 >>stream\n' + contentLines + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const offsets = [];
  let pdf = '%PDF-1.4\n';
  let offset = pdf.length;
  objects.forEach((obj, index) => {
    offsets.push(offset);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
    offset = pdf.length;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="game11-registrations-${Date.now()}.pdf"`);
  return res.send(Buffer.from(pdf, 'binary'));
});

router.delete('/registrations/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id.' });
  }
  const result = await statements.deleteById.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.json({ ok: true });
});

module.exports = router;

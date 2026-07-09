const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { statements } = require('../db');
const { validateRegistration } = require('../utils/validate');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

function makeRefCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = 'G11F-';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

router.post('/register', registerLimiter, async (req, res) => {
  const body = req.body || {};

  // Honeypot: a hidden field real visitors never fill in. Bots that
  // auto-fill every field will trip it. Respond as if it worked so the
  // bot doesn't learn anything, but skip the write.
  if (typeof body.company_website === 'string' && body.company_website.trim() !== '') {
    return res.status(201).json({ ok: true, refCode: makeRefCode() });
  }

  const { valid, errors, data } = validateRegistration(body);
  if (!valid) {
    return res.status(400).json({ error: 'Please check the highlighted fields.', fields: errors });
  }

  const existing = await statements.findByEmail.get(data.email);
  if (existing) {
    return res.status(409).json({
      error: 'That email is already registered for Game 11 Festival.',
      fields: { email: 'Already registered.' },
    });
  }

  let refCode = makeRefCode();
  let inserted = false;

  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    try {
      await statements.insert.run({
        ref_code: refCode,
        name: data.name,
        email: data.email,
        phone: data.phone,
        ip_address: req.ip,
      });
      inserted = true;
    } catch (err) {
      const msg = String(err.message || '');

      // A random reference-code collision is recoverable: try a new code.
      if (msg.toLowerCase().includes('ref_code')) {
        refCode = makeRefCode();
        continue;
      }

      // Anything else unique (e.g. duplicate email) is a real conflict.
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({
          error: 'That email is already registered for Game 11 Festival.',
          fields: { email: 'Already registered.' },
        });
      }

      console.error('Registration insert failed:', err);
      return res.status(500).json({ error: 'Something went wrong. Try again.' });
    }
  }

  if (!inserted) {
    console.error('Could not generate a unique reference code after several attempts.');
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }

  return res.status(201).json({ ok: true, refCode, name: data.name });
});

module.exports = router;

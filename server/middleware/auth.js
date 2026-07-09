const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'g11_admin';
const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 8);

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET is missing or too short. Set a long random value in your .env file.'
    );
  }
  return secret;
}

function signAdminToken(username) {
  return jwt.sign({ sub: username, role: 'admin' }, getSecret(), {
    expiresIn: `${SESSION_HOURS}h`,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
    path: '/',
  };
}

function requireAdmin(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (!token) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  try {
    req.admin = jwt.verify(token, getSecret());
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
}

module.exports = { COOKIE_NAME, signAdminToken, cookieOptions, requireAdmin };

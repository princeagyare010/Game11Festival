function getSafeRequestTarget(req) {
  const rawTarget = req.originalUrl || req.url || req.path || '/';
  const parsed = new URL(rawTarget, 'http://localhost');
  return parsed.pathname || '/';
}

module.exports = { getSafeRequestTarget };

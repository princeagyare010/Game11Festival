const isCloudDeployment = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RENDER ||
  process.env.VERCEL ||
  process.env.HEROKU
);

if (!isCloudDeployment) {
  require('dotenv').config();
}

if (isCloudDeployment && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');
const { statements, ensurePostgresInitialized } = require('./db');
const { getSafeRequestTarget } = require('./utils/logging');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function isStrongPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{16,}$/.test(value);
}

function validateProductionConfig() {
  const issues = [];
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!username) {
    issues.push('ADMIN_USERNAME must be set.');
  } else if (['admin', 'administrator'].includes(username.toLowerCase())) {
    issues.push('ADMIN_USERNAME should not use a common default value.');
  }

  if (!password || !isStrongPassword(password)) {
    issues.push('ADMIN_PASSWORD must be at least 16 characters and include upper/lowercase letters, a number, and a symbol.');
  }

  if (!jwtSecret || jwtSecret.length < 32) {
    issues.push('JWT_SECRET must be at least 32 characters long.');
  }

  if (issues.length > 0) {
    console.error(`[Game 11 Festival] Production security configuration errors:\n- ${issues.join('\n- ')}`);
    process.exit(1);
  }
}

// The app may sit behind a reverse proxy (Render, Railway, Nginx, etc).
// This makes secure cookies and req.ip work correctly behind that proxy.
app.set('trust proxy', 1);

if (IS_PRODUCTION) {
  validateProductionConfig();
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);

app.use((req, res, next) => {
  const forwardedProto = req.get('x-forwarded-proto');
  const isHttpsRequest = req.secure || forwardedProto?.split(',')[0]?.trim() === 'https';
  const host = req.get('host') || '';
  const isWww = host.startsWith('www.');
  const isHealthCheck = req.path === '/health' || req.path === '/healthz';
  const isAdminOrApi = req.path.startsWith('/admin') || req.path.startsWith('/api');

  if (IS_PRODUCTION && !isHealthCheck) {
    if (isWww || !isHttpsRequest) {
      const targetHost = isWww ? host.slice(4) : host;
      return res.redirect(301, `https://${targetHost}${req.originalUrl}`);
    }
  }

  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', isAdminOrApi ? 'noindex, nofollow' : 'index, follow');
  return next();
});

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - startedAt;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
    const safeRequestTarget = getSafeRequestTarget(req);
    const message = `[request] ${req.method} ${safeRequestTarget} -> ${statusCode} (${durationMs}ms)`;

    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
  });
  next();
});

// Clean URLs: Redirect .html requests to extensionless equivalents for route pages.
// Preserve real files like verification HTML files when they exist in the public directory.
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const requestedFilePath = path.join(PUBLIC_DIR, req.path.slice(1));
    const exactFileExists = fs.existsSync(requestedFilePath) && fs.statSync(requestedFilePath).isFile();

    if (req.path === '/index.html') {
      return res.redirect(301, '/');
    }

    if (exactFileExists) {
      return next();
    }

    const cleanPath = req.path.slice(0, -5);
    return res.redirect(301, cleanPath + (req.url.substring(req.path.length) || ''));
  }
  next();
});

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      // Fingerprint-free assets can be cached briefly; HTML should always
      // be revalidated so deploys show up immediately.
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  })
);

let lastDbCheckTime = 0;
let lastDbCheckOk = true;

app.get('/health', async (req, res) => {
  const now = Date.now();
  if (now - lastDbCheckTime < 10000) {
    if (lastDbCheckOk) {
      return res.status(200).json({ status: 'OK', database: 'connected', cached: true });
    } else {
      return res.status(200).json({ status: 'DEGRADED', database: 'unavailable', cached: true });
    }
  }

  try {
    await statements.count.get();
    lastDbCheckTime = now;
    lastDbCheckOk = true;
    res.status(200).json({ status: 'OK', database: 'connected', cached: false });
  } catch (err) {
    console.error('Health check database query failed:', err);
    lastDbCheckTime = now;
    lastDbCheckOk = false;
    res.status(200).json({ status: 'DEGRADED', database: 'unavailable', cached: false, message: 'Database temporarily unavailable' });
  }
});

function sendStaticAsset(req, res, assetFileName) {
  const assetPath = path.join(PUBLIC_DIR, 'assets', assetFileName);
  if (fs.existsSync(assetPath)) {
    return res.sendFile(assetPath);
  }
  return res.status(404).send('Not found');
}

app.get('/favicon.ico', (req, res) => sendStaticAsset(req, res, 'favicon.ico'));

app.get(/^\/apple-touch-icon(?:-[^/]+)?(?:-precomposed)?\.png$/i, (req, res) => {
  return sendStaticAsset(req, res, 'apple-touch-icon.png');
});

app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});
app.get('/terms', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'terms.html')));

app.use('/api/admin', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return next();
});
app.use('/api', registerRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn(
    '\n[Game 11 Festival] Admin login is not fully configured yet.\n' +
      'Set ADMIN_USERNAME and ADMIN_PASSWORD in .env (see .env.example)\n'
  );
}

async function startServer() {
  if (process.env.DATABASE_URL) {
    await ensurePostgresInitialized();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Game 11 Festival server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Game 11 Festival server:', err);
  process.exit(1);
});

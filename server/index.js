require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const registerRoutes = require('./routes/register');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// The app may sit behind a reverse proxy (Render, Railway, Nginx, etc).
// This makes secure cookies and req.ip work correctly behind that proxy.
app.set('trust proxy', 1);

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

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

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

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'terms.html')));

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

app.listen(PORT, () => {
  console.log(`Game 11 Festival server running on http://localhost:${PORT}`);
});

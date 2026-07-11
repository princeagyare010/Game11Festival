# Game 11 Festival — registration site

A registration ("onboarding") site for Game 11 Festival

## What's inside

```
public/                  Frontend — plain HTML/CSS/JS, no build step
  index.html              Registration / onboarding page
  admin.html              Admin login + dashboard
  terms.html              Terms & Privacy (edit the details before launch)
  css/
    tokens.css             Shared colors, type, spacing (edit the palette here)
    style.css               Landing page
    admin.css                Admin dashboard
    legal.css                 Terms page
  js/
    main.js                 Registration form logic + the ticket-stub transition
    admin.js                  Admin dashboard logic
    legal.js                   Tiny helper for the terms page
  assets/                  Logo (webp, transparent), favicons, hero video + poster

server/                  Backend — Node.js + Express
  index.js                 App entry point (security headers, static files, routes)
  db.js                     SQLite setup (better-sqlite3)
  routes/register.js        POST /api/register (public)
  routes/admin.js            Admin login + data routes (protected)
   middleware/auth.js          Cookie/JWT session check
   utils/validate.js            Input validation


data/                    SQLite database file lives here at runtime (not in git)
```
QR code session 

by PRINCE AGYARE

## Deployment

### Deploy on Railway

You can deploy this application to Railway in one click using the button below:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fprinceagyare010%2FGame11Festival&envs=PORT%2CNODE_ENV%2CADMIN_USERNAME%2CADMIN_PASSWORD%2CJWT_SECRET%2CADMIN_SESSION_HOURS%2CDATABASE_URL%2CPGSSLMODE&optionalEnvs=DATABASE_URL%2CPGSSLMODE&PORTDefault=3000&NODE_ENVDefault=production&ADMIN_SESSION_HOURSDefault=8&PGSSLMODEDefault=prefer)

### Required Environment Variables

When deploying to Railway, make sure to configure the following environment variables in your service settings:

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Must be set to `production` to enable HTTPS redirects and secure cookies. | `production` |
| `ADMIN_USERNAME` | Username for accessing the admin dashboard (`/admin`). | E.g., `Game11@festival.com` |
| `ADMIN_PASSWORD` | Strong password (16+ characters, mixed case, number, symbol) for the admin dashboard. | *(Keep secure)* |
| `JWT_SECRET` | Secret key for signing session tokens (32+ character random string). | *(Keep secure)* |
| `ADMIN_SESSION_HOURS` | Duration in hours that an admin session remains active. | `8` |
| `DATABASE_URL` | PostgreSQL connection string (Automatically injected if you link a PostgreSQL database in Railway). | `postgresql://...` |
| `PGSSLMODE` | PostgreSQL SSL connection mode. | `prefer` |

### Health Checks and Domains

- **Health Checks**: The application includes a `/health` endpoint configured in `railway.json`. Railway will automatically poll this during deployment to verify the database and app are up before switching traffic.
- **Custom Domain**: In Railway, you can link your custom domain (e.g. `game11festival.com`) to the service. The server is configured to automatically redirect traffic from `www.game11festival.com` and all HTTP requests to `https://game11festival.com`.


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

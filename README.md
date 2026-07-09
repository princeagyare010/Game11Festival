# Game 11 Festival — registration site

A registration ("onboarding") site for Game 11 Festival: a full-bleed video hero built
from your own Instagram footage, a glassmorphic sign-up form that collects name, email
and phone, and a password-protected admin dashboard to view/search/export everyone
who registered.

No gradients, no template feel — colors are sampled directly from your logo
(`#39d418` green, true black, soft white), and the confirmation state is styled like a
festival admission tag, echoing the "FOOTBALL TOURNAMENT" hang-tag in your logo.

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
  scripts/hash-password.js      Helper to generate your admin password hash

data/                    SQLite database file lives here at runtime (not in git)
```

## How the security works

- **Passwords are never stored in plain text.** The admin password is hashed with
  bcrypt; only the hash lives in `.env`.
- **Admin sessions** use a signed JWT in an `httpOnly`, `Secure`, `SameSite=Strict`
  cookie — not readable by JavaScript, so it can't be stolen via a script injection.
- **Rate limiting** on both the public registration endpoint and the admin login
  endpoint, to blunt spam and brute-force attempts.
- **A hidden honeypot field** on the registration form quietly catches basic bots
  without showing a CAPTCHA to real visitors.
- **Input validation** happens on both the client (instant feedback) and the server
  (the client can't be trusted), with duplicate-email protection.
- **Helmet** sets a strict Content-Security-Policy and standard security headers;
  SQL is always parameterized (no string-built queries).
- The database file and `.env` are excluded from version control via `.gitignore`.

None of this replaces HTTPS — see Deployment below.

## Local setup

Requires Node.js 18+.

```bash
npm install
cp .env.example .env
```

Generate a session secret and paste it into `.env` as `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pick your admin password and generate its hash — this prints a line you paste into
`.env` as `ADMIN_PASSWORD_HASH`:

```bash
npm run hash-password -- "your-real-password"
```

Set `ADMIN_USERNAME` in `.env` to whatever you'd like to sign in with, then start it:

```bash
npm start
```

Visit `http://localhost:3000` for the registration page and
`http://localhost:3000/admin` for the dashboard.

## Deployment

This is a normal Node app, so it runs on Render, Railway, Fly.io, a VPS, etc.

1. Set the same environment variables from `.env` in your host's dashboard
   (`PORT`, `NODE_ENV=production`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`,
   `JWT_SECRET`).
2. Make sure the `data/` folder is on **persistent** storage — some hosts wipe the
   filesystem on every deploy, which would delete your registrations. Most hosts
   offer a "persistent disk" or "volume" option; mount it at `data/`.
3. If you want a free-tier database instead of the local SQLite file, create a
   Postgres database on a free service such as Neon or Supabase, then set
   `DATABASE_URL` in your host's environment variables. The app will automatically
   switch to Postgres when that variable is present.
4. Put it behind HTTPS (your host's built-in TLS, or a reverse proxy like Nginx with
   Let's Encrypt). `NODE_ENV=production` makes the admin cookie `Secure`, meaning it
   will only work over HTTPS.
5. Point your domain at it, and update the Instagram/terms links in the footer if
   your handle ever changes.

## Editing content

- **Colors, fonts, spacing** — all defined once in `public/css/tokens.css`.
- **Copy on the registration page** — edit directly in `public/index.html`. The date
  and venue are deliberately left as "we'll email you when it's locked in" since
  they weren't confirmed at build time — once you have them, add a line under the
  `hero__sub` paragraph.
- **Terms & Privacy** — `public/terms.html` is a real starting draft covering what
  the site actually collects and does, using your public contact details
  (`game11footballassoc@gmail.com`). It is not legal advice — worth a quick read
  through before you launch, especially the photography/media consent section.
- **Hero video** — replace `public/assets/hero.mp4` (and its poster,
  `hero-poster.webp`) any time; the current one is your own Instagram reel with the
  audio stripped so it can autoplay muted in the browser.
- **Logo** — `public/assets/logo.webp` is your logo with the black background
  removed (kept transparent) so it sits cleanly over the video and the glass panels.
  The favicon files keep a solid black backing instead, since a transparent icon can
  disappear on a light browser tab bar.

## Admin dashboard

- Sign in at `/admin` with the username/password you configured.
- Search box filters by name, email, phone, or reference code as you type.
- **Export CSV** downloads the full list.
- **Delete** is a two-step confirm — click once to arm it, click again within a few
  seconds to actually remove that registration.
- Sessions last 8 hours by default (`ADMIN_SESSION_HOURS` in `.env`).

## A note on the event date

I couldn't find a confirmed 2026 date for the next festival, so the site collects
registrations and promises to email people the details "the moment they're locked
in" rather than guessing. As soon as you have a date/venue, it's worth adding it to
the hero copy and sending a follow-up email to everyone already on the list (their
addresses are all in the admin export).

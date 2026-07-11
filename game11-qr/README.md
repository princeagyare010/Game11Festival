# Game 11 Festival — QR code

A branded QR code for the registration site: black-on-white modules (for
reliable scanning) with your crown mark embedded in the center, plus a
ready-to-post/print card built around it. No gradients.

**Placeholder URL:** `https://game11festival.com/` — I didn't have your real
deployed domain yet, so this points at a placeholder. Swap it in ten seconds
(see below) the moment you know the real one.

## What's inside

```
output/
  qr-bare.svg     The QR alone, vector - perfect for print at any size,
                   or dropping into other designs.
  qr-bare.png     Same thing, high-res raster (1600x1600).
  qr-card.png     Branded card with headline, QR, logo, URL text and your
                   Instagram handle - ready to post or print as-is (1200x1500,
                   a 4:5 ratio that works for both print and an Instagram post).

assets/
  crown.png        The crown mark cropped from your logo, used inside the QR.
  logo.webp         Full logo lockup, used at the top of the card.

fonts/              Big Shoulders Display + Archivo (Google Fonts, OFL
                     licensed - free to bundle and use).

generate_qr.py      Builds the bare QR.
generate_card.py    Builds the branded card around it.
make.py             Runs both in one go - this is the only script you need.
```

## Regenerating with your real URL

Once the site is live:

```bash
pip install segno cairosvg pillow opencv-python-headless --break-system-packages
python3 make.py "https://your-real-domain.com/"
```

That's it — both files in `output/` are rewritten. No Node, no browser,
just Python.

## Why the QR looks the way it does

A few choices were deliberate, based on testing, not just taste:

- **The scan-critical parts stay plain black-on-white.** The three corner
  "eyes" are perfectly square (no rounding) and solid black. In testing,
  rounding those corners — even slightly — broke detection in a real
  decoder. The rounded, softer look is reserved for the ordinary data
  modules, which tolerate it fine.
- **All the branding lives in the embedded crown and the card**, not in
  recoloring the QR's own modules. Green reads as "light" to a scanner's
  brightness threshold, so a green finder pattern risks not being read as
  "dark" at all. Keeping the mechanism standard and putting color only in
  the logo and frame is how most reliable "styled" QR codes are actually
  done.
- **Error correction is set to High (~30% redundancy)**, specifically so
  the crown can sit on top of the code without harming scannability.
- Every regeneration re-verifies itself: `generate_qr.py` decodes its own
  output with OpenCV before it lets the file stand, and exits with an error
  if it doesn't get the exact URL back. Before shipping this one, it was
  also stress-tested down to 150px, under blur, JPEG recompression,
  rotation, and low light — all passed.

## Using it

- **Minimum size:** don't print smaller than about 2.5cm / 1 inch on a
  side. Test a printed copy with a couple of different phones before doing
  a big print run.
- **Contrast matters more than color:** if you ever recolor the card
  itself, leave the QR's own white backing untouched — don't place it
  directly on a dark or busy background.
- The `qr-bare.svg` is the one to hand to a printer for anything large
  (banners, jerseys, pitch-side signage) since it scales without quality
  loss.

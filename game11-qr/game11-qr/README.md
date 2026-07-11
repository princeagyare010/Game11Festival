# Game 11 Festival — QR code

A branded QR code for the registration site: black-on-white modules (for
reliable scanning) with your crown mark embedded in the center, plus a
ready-to-post/print card built around it. No gradients.

**Placeholder URL:** `https://game11festival.com/` — I didn't have your real
deployed domain yet, so this points at a placeholder. Swap it in one command
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
requirements.txt    The 3 packages needed, for `pip install -r requirements.txt`.
```

Only `output/qr-bare.svg`, `output/qr-bare.png`, and `output/qr-card.png` are
the actual images. Everything else is what generates them.

## Setup

You need Python 3.9+. Everything below is run from a terminal, inside this
`game11-qr` folder.

**Check Python is installed:**

- Windows (PowerShell or Command Prompt): `py --version`
- Mac/Linux (Terminal): `python3 --version`

If that errors instead of printing a version, install Python from
[python.org/downloads](https://python.org/downloads) first — on the
Windows installer, tick **"Add python.exe to PATH"** before clicking Install.

**Open a terminal in this folder:**

- Windows: open the `game11-qr` folder in File Explorer, click the address
  bar, type `cmd`, press Enter.
- Mac: right-click the `game11-qr` folder → Services → "New Terminal at
  Folder" (or open Terminal and `cd` to it).

**Install the 3 required packages:**

```bash
# Windows
py -m pip install -r requirements.txt

# Mac/Linux
python3 -m pip install -r requirements.txt
```

If that fails with a "permission" or "externally managed environment"
error on Mac/Linux, run this instead (creates an isolated environment,
doesn't touch anything else on your system):

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Generate it:**

```bash
# Windows
py make.py "https://your-real-domain.com/"

# Mac/Linux
python3 make.py "https://your-real-domain.com/"
```

That rewrites all three files in `output/`. Leave the URL off and it falls
back to the placeholder, so you can just run `py make.py` any time to
re-check things look right.

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
  also stress-tested down to 200px, under blur, JPEG recompression,
  rotation, and low light — all passed.
- Everything renders with Pillow directly — no cairosvg, no native Cairo
  library to install. That dependency existed in an earlier version and
  was removed specifically because it's a pain on Windows.

## Using it

- **Minimum size:** don't print smaller than about 2.5cm / 1 inch on a
  side. Test a printed copy with a couple of different phones before doing
  a big print run.
- **Contrast matters more than color:** if you ever recolor the card
  itself, leave the QR's own white backing untouched — don't place it
  directly on a dark or busy background.
- `qr-bare.svg` is the one to hand to a printer for anything large
  (banners, jerseys, pitch-side signage) since it scales without quality
  loss.

## Should this live inside the game11-festival website project?

They don't need to merge — this is a standalone image generator (Python)
and the website is a standalone web server (Node), and neither runs the
other. Keep them as two separate folders.

That said, if you want the *live site* to also be able to show or link to
the QR, copy the two files people would actually see into the website's
`public/assets/` folder:

```
game11-festival/public/assets/qr-card.png
game11-festival/public/assets/qr-bare.svg
```

Nothing else from this folder (scripts, fonts, source assets) needs to go
into the website project — those only exist to *produce* the images, the
website only ever needs to serve the finished ones.

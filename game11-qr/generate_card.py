#!/usr/bin/env python3
"""
Builds the branded "scan to join" card around the QR code from
generate_qr.py - pure Pillow, no browser/Node needed.

Usage:
    python3 generate_card.py "https://your-real-domain.com/"

Run generate_qr.py first (or just run qr.py which does both, see below).
Writes output/qr-card.png - a 1200x1500 (4:5) poster/social-ready card.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
FONTS = os.path.join(HERE, "fonts")
OUTPUT = os.path.join(HERE, "output")

INK = (5, 5, 5)
CHALK = (247, 247, 244)
CHALK_DIM = (247, 247, 244, 168)
GREEN = (57, 212, 24)

W, H = 1200, 1500  # final size; we draw at 2x internally then downscale
SCALE = 2


def font(name, size, weight=None, width=None):
    path = os.path.join(FONTS, name)
    f = ImageFont.truetype(path, size)
    try:
        axes = f.get_variation_axes()
        if len(axes) == 1 and weight is not None:
            f.set_variation_by_axes([weight])
        elif len(axes) == 2 and weight is not None and width is not None:
            f.set_variation_by_axes([weight, width])
    except Exception:
        pass
    return f


def text_width(draw, text, fnt, tracking=0):
    total = 0
    for ch in text:
        bbox = draw.textbbox((0, 0), ch, font=fnt)
        total += (bbox[2] - bbox[0]) + tracking
    return total - (tracking if text else 0)


def draw_tracked_text(draw, cx, y, text, fnt, fill, tracking=0, anchor_y="top"):
    """Centered text with manual letter-spacing (PIL has no native tracking)."""
    total_w = text_width(draw, text, fnt, tracking)
    x = cx - total_w / 2
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill, anchor=("l" + ("a" if anchor_y == "top" else "m")))
        bbox = draw.textbbox((0, 0), ch, font=fnt)
        x += (bbox[2] - bbox[0]) + tracking


def main():
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://game11festival.com/"
    display_url = target_url.replace("https://", "").replace("http://", "").rstrip("/")

    S = SCALE
    canvas = Image.new("RGB", (W * S, H * S), INK)
    draw = ImageDraw.Draw(canvas)

    cx = (W * S) // 2

    # --- logo lockup ---
    logo = Image.open(os.path.join(ASSETS, "logo.webp")).convert("RGBA")
    logo_w = 300 * S
    logo_h = int(logo.height * (logo_w / logo.width))
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    logo_y = 76 * S
    canvas.paste(logo, (cx - logo_w // 2, logo_y), logo)

    # --- eyebrow ---
    eyebrow_font = font("Archivo.ttf", 20 * S, weight=700, width=100)
    eyebrow_y = logo_y + logo_h + 54 * S
    dot_r = 5 * S
    label = "REGISTRATION OPEN"
    tracking = int(3.2 * S)
    label_w = text_width(draw, label, eyebrow_font, tracking)
    dot_gap = 12 * S
    start_x = cx - (label_w + dot_gap * 2 + dot_r * 2) / 2
    dot_cx = start_x + dot_r
    dot_cy = eyebrow_y + 9 * S
    for rad, alpha in [(dot_r * 2.1, 60), (dot_r, 255)]:
        pass
    draw.ellipse(
        [dot_cx - dot_r * 1.9, dot_cy - dot_r * 1.9, dot_cx + dot_r * 1.9, dot_cy + dot_r * 1.9],
        fill=(57, 212, 24, 40),
    )
    draw.ellipse([dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r], fill=GREEN)
    draw_tracked_text(draw, cx + (dot_r * 2 + dot_gap) / 2, eyebrow_y, label, eyebrow_font, GREEN, tracking)

    # --- headline ---
    head_font = font("BigShouldersDisplay.ttf", 120 * S, weight=800)
    line1, line2 = "SCAN TO", "JOIN"
    head_y = eyebrow_y + 46 * S
    for i, line in enumerate([line1, line2]):
        bbox = draw.textbbox((0, 0), line, font=head_font)
        lh = bbox[3] - bbox[1]
        draw.text((cx, head_y + i * lh * 0.98), line, font=head_font, fill=CHALK, anchor="ma")
    headline_bottom = head_y + 2 * (draw.textbbox((0, 0), line1, font=head_font)[3]) * 0.98

    # --- QR card ---
    qr = Image.open(os.path.join(OUTPUT, "qr-bare.png")).convert("RGB")
    qr_display = 560 * S
    qr_resized = qr.resize((qr_display, qr_display), Image.LANCZOS)
    pad = 22 * S
    card_size = qr_display + pad * 2
    card_y = int(headline_bottom) + 44 * S

    shadow = Image.new("RGBA", (card_size + 160 * S, card_size + 160 * S), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        [80 * S, 80 * S, 80 * S + card_size, 80 * S + card_size],
        radius=36 * S,
        fill=(0, 0, 0, 130),
    )
    shadow = shadow.filter(__import__("PIL.ImageFilter", fromlist=["ImageFilter"]).GaussianBlur(26 * S))
    canvas.paste(
        shadow,
        (cx - shadow.width // 2, card_y - 80 * S),
        shadow,
    )

    qr_card = Image.new("RGB", (card_size, card_size), CHALK)
    qr_card.paste(qr_resized, (pad, pad))
    canvas.paste(qr_card, (cx - card_size // 2, card_y))

    # --- url --- (auto-shrinks so long paths never overflow the card)
    url_size = 33 * S
    url_font = font("Archivo.ttf", url_size, weight=600, width=100)
    max_w = W * S * 0.86
    while text_width(draw, display_url, url_font) > max_w and url_size > 16 * S:
        url_size -= 2 * S
        url_font = font("Archivo.ttf", url_size, weight=600, width=100)
    url_y = card_y + card_size + 40 * S
    draw.text((cx, url_y), display_url, font=url_font, fill=CHALK, anchor="ma")

    # --- footer: IG glyph + handle ---
    foot_font = font("Archivo.ttf", 23 * S, weight=600, width=100)
    foot_text = "@game11festival"
    foot_y = H * S - 62 * S
    icon_size = 25 * S
    handle_w = draw.textbbox((0, 0), foot_text, font=foot_font)[2]
    gap = 9 * S
    total_w = icon_size + gap + handle_w
    icon_x = cx - total_w / 2
    icon_y = foot_y - icon_size * 0.72

    idraw_img = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(idraw_img)
    s = icon_size
    idraw.rounded_rectangle([s * 0.08, s * 0.08, s * 0.94, s * 0.94], radius=s * 0.22, outline=CHALK_DIM, width=max(1, int(1.6 * S)))
    idraw.ellipse([s * 0.28, s * 0.28, s * 0.72, s * 0.72], outline=CHALK_DIM, width=max(1, int(1.6 * S)))
    idraw.ellipse([s * 0.76, s * 0.16, s * 0.86, s * 0.26], fill=CHALK_DIM)
    canvas.paste(idraw_img, (int(icon_x), int(icon_y)), idraw_img)

    draw.text((icon_x + icon_size + gap, foot_y), foot_text, font=foot_font, fill=CHALK_DIM, anchor="lm")

    final = canvas.resize((W, H), Image.LANCZOS)
    out_path = os.path.join(OUTPUT, "qr-card.png")
    final.save(out_path)
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()

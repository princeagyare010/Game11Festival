#!/usr/bin/env python3
"""
Generates a high-end, branded QR code for Game 11 Festival.

Usage:
    python3 generate_qr.py "https://your-real-domain.com/"

Produces, in output/:
    qr-bare.svg   - the QR code alone (vector), for dropping into flyers,
                    posters, jerseys, or the website itself.
    qr-bare.png   - the same thing, rasterized at high resolution.

Design notes
------------
The QR itself is kept to plain black-on-white with only mild corner
rounding, on purpose: that is what scans reliably in every lighting
condition and every scanner app. All of the brand color and personality
lives in the embedded crown mark and the surrounding card (see
generate_card.py), never in the scan-critical modules themselves.

The finder patterns (the three corner "eyes") are left perfectly square.
Rounding them - even slightly - was found during testing to break
detection in a real decoder, so that styling is reserved for the ordinary
data modules, which tolerate it fine.

Everything is drawn with Pillow directly (no cairosvg/Cairo). An earlier
version rendered through an SVG+cairosvg step; that pulled in a native
Cairo library dependency that's genuinely annoying to install on Windows,
so the PNG is now rasterized with Pillow alone. The .svg file is still
written for anyone who wants a true vector for large-format printing -
it's just plain text generation, no rendering library needed for that part.
"""

import os
import sys

import segno
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
OUTPUT = os.path.join(HERE, "output")

CHALK = (247, 247, 244)
BLACK = (0, 0, 0)
CHALK_HEX = "#F7F7F4"
BLACK_HEX = "#000000"

DEFAULT_URL = "https://game11festival.com/"

SUPERSAMPLE = 3200   # render size before downscaling
FINAL_SIZE = 1600    # shipped PNG size
LOGO_FRAC = 0.24
MODULE_RADIUS_FRAC = 0.30


def _qr_layout(url, size_px):
    """Shared geometry: matrix, grid edges, and logo knockout box."""
    qr = segno.make(url, error="h", boost_error=False)
    matrix = [list(row) for row in qr.matrix]
    n = len(matrix)
    quiet = 4
    total = n + quiet * 2
    module = size_px / total
    edges = [round(k * module) for k in range(total + 1)]

    logo_size = size_px * LOGO_FRAC
    logo_x = (size_px - logo_size) / 2
    logo_y = (size_px - logo_size) / 2
    knock_pad = logo_size * 0.16
    kx, ky = logo_x - knock_pad, logo_y - knock_pad
    ksize = logo_size + 2 * knock_pad

    return matrix, n, quiet, edges, (logo_x, logo_y, logo_size), (kx, ky, ksize)


def _is_finder(i, j, n):
    if i < 7 and j < 7:
        return True
    if i < 7 and j >= n - 7:
        return True
    if i >= n - 7 and j < 7:
        return True
    return False


def build_qr_png(url, final_size=FINAL_SIZE, supersample=SUPERSAMPLE):
    """Renders the styled QR straight to a PIL Image. Supersample+downscale
    keeps edges looking smooth while the module grid itself stays crisp
    (crisp edges are what make it decode reliably - verified empirically)."""
    matrix, n, quiet, edges, (logo_x, logo_y, logo_size), (kx, ky, ksize) = _qr_layout(
        url, supersample
    )

    img = Image.new("RGB", (supersample, supersample), CHALK)
    draw = ImageDraw.Draw(img)

    for i in range(n):
        for j in range(n):
            if _is_finder(i, j, n) or not matrix[i][j]:
                continue
            x0, x1 = edges[quiet + j], edges[quiet + j + 1]
            y0, y1 = edges[quiet + i], edges[quiet + i + 1]
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            w = x1 - x0
            if (kx - w * 0.4) <= cx <= (kx + ksize + w * 0.4) and (
                ky - w * 0.4
            ) <= cy <= (ky + ksize + w * 0.4):
                continue
            r = w * MODULE_RADIUS_FRAC
            draw.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=r, fill=BLACK)

    def draw_finder(top_i, top_j):
        # Perfectly square on purpose - see module docstring.
        ox, oy = edges[quiet + top_j], edges[quiet + top_i]
        outer = edges[quiet + top_j + 7] - ox
        draw.rectangle([ox, oy, ox + outer - 1, oy + outer - 1], fill=BLACK)
        gx, gy = edges[quiet + top_j + 1], edges[quiet + top_i + 1]
        gap = edges[quiet + top_j + 6] - gx
        draw.rectangle([gx, gy, gx + gap - 1, gy + gap - 1], fill=CHALK)
        ix, iy = edges[quiet + top_j + 2], edges[quiet + top_i + 2]
        inner = edges[quiet + top_j + 5] - ix
        draw.rectangle([ix, iy, ix + inner - 1, iy + inner - 1], fill=BLACK)

    draw_finder(0, 0)
    draw_finder(0, n - 7)
    draw_finder(n - 7, 0)

    draw.rounded_rectangle([kx, ky, kx + ksize, ky + ksize], radius=ksize * 0.22, fill=CHALK)

    crown = Image.open(os.path.join(ASSETS, "crown.png")).convert("RGBA")
    crown_w = int(logo_size)
    crown_h = int(logo_size * crown.height / crown.width)
    crown = crown.resize((crown_w, crown_h), Image.LANCZOS)
    paste_x = int(logo_x)
    paste_y = int(logo_y + (logo_size - crown_h) / 2)
    img.paste(crown, (paste_x, paste_y), crown)

    return img.resize((final_size, final_size), Image.LANCZOS)


def build_qr_svg(url, size_px=900):
    """Plain-text SVG generation (no rendering library needed) - a true
    vector version for large-format printing. Same geometry/logic as the
    PNG path above, just emitted as markup instead of drawn."""
    matrix, n, quiet, edges, (logo_x, logo_y, logo_size), (kx, ky, ksize) = _qr_layout(
        url, size_px
    )

    def b64_file(path):
        import base64

        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")

    parts = [
        f'<svg viewBox="0 0 {size_px} {size_px}" xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" shape-rendering="crispEdges">',
        f'<rect x="0" y="0" width="{size_px}" height="{size_px}" fill="{CHALK_HEX}"/>',
    ]

    def draw_finder(top_i, top_j):
        ox, oy = edges[quiet + top_j], edges[quiet + top_i]
        outer = edges[quiet + top_j + 7] - ox
        gx, gy = edges[quiet + top_j + 1], edges[quiet + top_i + 1]
        gap = edges[quiet + top_j + 6] - gx
        ix, iy = edges[quiet + top_j + 2], edges[quiet + top_i + 2]
        inner = edges[quiet + top_j + 5] - ix
        parts.append(f'<rect x="{ox}" y="{oy}" width="{outer}" height="{outer}" fill="{BLACK_HEX}"/>')
        parts.append(f'<rect x="{gx}" y="{gy}" width="{gap}" height="{gap}" fill="{CHALK_HEX}"/>')
        parts.append(f'<rect x="{ix}" y="{iy}" width="{inner}" height="{inner}" fill="{BLACK_HEX}"/>')

    draw_finder(0, 0)
    draw_finder(0, n - 7)
    draw_finder(n - 7, 0)

    for i in range(n):
        for j in range(n):
            if _is_finder(i, j, n) or not matrix[i][j]:
                continue
            x0, x1 = edges[quiet + j], edges[quiet + j + 1]
            y0, y1 = edges[quiet + i], edges[quiet + i + 1]
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            w = x1 - x0
            if (kx - w * 0.4) <= cx <= (kx + ksize + w * 0.4) and (
                ky - w * 0.4
            ) <= cy <= (ky + ksize + w * 0.4):
                continue
            r = w * MODULE_RADIUS_FRAC
            parts.append(
                f'<rect x="{x0}" y="{y0}" width="{w}" height="{y1-y0}" rx="{r:.2f}" fill="{BLACK_HEX}"/>'
            )

    parts.append(
        f'<rect x="{kx:.2f}" y="{ky:.2f}" width="{ksize:.2f}" height="{ksize:.2f}" '
        f'rx="{ksize*0.22:.2f}" fill="{CHALK_HEX}"/>'
    )
    crown_b64 = b64_file(os.path.join(ASSETS, "crown.png"))
    parts.append(
        f'<image x="{logo_x:.2f}" y="{logo_y:.2f}" width="{logo_size:.2f}" '
        f'height="{logo_size:.2f}" xlink:href="data:image/png;base64,{crown_b64}" '
        f'preserveAspectRatio="xMidYMid meet"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts), n


def verify_scans(png_path, expected_url):
    """Hard QA gate: decode the actual shipped PNG and confirm it matches."""
    import cv2

    img = cv2.imread(png_path)
    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(img)
    ok = data == expected_url
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] decode check on {png_path}: {data!r}")
    return ok


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    os.makedirs(OUTPUT, exist_ok=True)

    svg, n = build_qr_svg(url)
    svg_path = os.path.join(OUTPUT, "qr-bare.svg")
    with open(svg_path, "w") as f:
        f.write(svg)

    png = build_qr_png(url)
    png_path = os.path.join(OUTPUT, "qr-bare.png")
    png.save(png_path)

    print(f"Encoded URL : {url}")
    print(f"QR version  : {n}x{n} modules, error correction H")
    print(f"Wrote       : {svg_path}")
    print(f"Wrote       : {png_path}")

    ok = verify_scans(png_path, url)
    if not ok:
        print("\n!! WARNING: the generated QR did not decode back to the exact URL.")
        print("!! Do not ship this file - inspect output/qr-bare.png before using it.")
        sys.exit(1)


if __name__ == "__main__":
    main()

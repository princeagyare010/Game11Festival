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

Module edges are snapped to a shared integer-pixel grid and rendered with
shape-rendering="crispEdges". Without this, sub-pixel seams between
adjacent modules get anti-aliased into faint gray hairlines that are
enough to break decoding - this was verified empirically with OpenCV's
QRCodeDetector during development (plain anti-aliased rects failed to
decode; grid-snapped + crispEdges decoded reliably at every size tested,
400px-3200px, before and after high-quality downscaling).
"""

import base64
import os
import sys

import segno

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
OUTPUT = os.path.join(HERE, "output")

CHALK = "#F7F7F4"
BLACK = "#000000"

DEFAULT_URL = "https://game11festival.com/"

SUPERSAMPLE = 3200   # render size before downscaling
FINAL_SIZE = 1600    # shipped PNG size


def b64_file(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def build_qr_svg(url, size_px=900, logo_frac=0.24, module_radius_frac=0.30):
    """Returns (svg_string, module_count) for a styled QR encoding `url`."""
    qr = segno.make(url, error="h", boost_error=False)
    matrix = [list(row) for row in qr.matrix]
    n = len(matrix)

    quiet = 4
    total = n + quiet * 2
    module = size_px / total

    # Shared integer grid lines: adjacent modules always reference the same
    # edge value, so there is never a sub-pixel gap between them.
    edges = [round(k * module) for k in range(total + 1)]

    def cell(i, j):
        x0, x1 = edges[quiet + j], edges[quiet + j + 1]
        y0, y1 = edges[quiet + i], edges[quiet + i + 1]
        return x0, y0, x1 - x0, y1 - y0

    def is_finder(i, j):
        if i < 7 and j < 7:
            return True
        if i < 7 and j >= n - 7:
            return True
        if i >= n - 7 and j < 7:
            return True
        return False

    parts = []
    parts.append(
        f'<svg viewBox="0 0 {size_px} {size_px}" xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" shape-rendering="crispEdges">'
    )
    parts.append(f'<rect x="0" y="0" width="{size_px}" height="{size_px}" fill="{CHALK}"/>')

    def draw_finder(top_i, top_j):
        # Sharp corners only, deliberately: scanners locate the whole code
        # by matching the finder pattern's exact concentric-square shape,
        # and rounding it (even slightly) was found to break detection in
        # testing. All the "soft" premium styling stays on the data modules.
        ox = edges[quiet + top_j]
        oy = edges[quiet + top_i]
        outer = edges[quiet + top_j + 7] - ox
        gx, gy = edges[quiet + top_j + 1], edges[quiet + top_i + 1]
        gap = edges[quiet + top_j + 6] - gx
        ix, iy = edges[quiet + top_j + 2], edges[quiet + top_i + 2]
        inner = edges[quiet + top_j + 5] - ix

        parts.append(f'<rect x="{ox}" y="{oy}" width="{outer}" height="{outer}" fill="{BLACK}"/>')
        parts.append(f'<rect x="{gx}" y="{gy}" width="{gap}" height="{gap}" fill="{CHALK}"/>')
        parts.append(f'<rect x="{ix}" y="{iy}" width="{inner}" height="{inner}" fill="{BLACK}"/>')

    draw_finder(0, 0)
    draw_finder(0, n - 7)
    draw_finder(n - 7, 0)

    logo_size = size_px * logo_frac
    logo_x = (size_px - logo_size) / 2
    logo_y = (size_px - logo_size) / 2
    knock_pad = logo_size * 0.16
    kx, ky = logo_x - knock_pad, logo_y - knock_pad
    ksize = logo_size + 2 * knock_pad

    for i in range(n):
        for j in range(n):
            if is_finder(i, j) or not matrix[i][j]:
                continue
            x, y, w, h = cell(i, j)
            cx, cy = x + w / 2, y + h / 2
            if (kx - w * 0.4) <= cx <= (kx + ksize + w * 0.4) and (
                ky - h * 0.4
            ) <= cy <= (ky + ksize + h * 0.4):
                continue
            r = min(w, h) * module_radius_frac
            parts.append(
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r:.2f}" fill="{BLACK}"/>'
            )

    parts.append(
        f'<rect x="{kx:.2f}" y="{ky:.2f}" width="{ksize:.2f}" height="{ksize:.2f}" '
        f'rx="{ksize*0.22:.2f}" fill="{CHALK}"/>'
    )

    crown_b64 = b64_file(os.path.join(ASSETS, "crown.png"))
    parts.append(
        f'<image x="{logo_x:.2f}" y="{logo_y:.2f}" width="{logo_size:.2f}" '
        f'height="{logo_size:.2f}" xlink:href="data:image/png;base64,{crown_b64}" '
        f'preserveAspectRatio="xMidYMid meet"/>'
    )

    parts.append("</svg>")
    return "\n".join(parts), n


def rasterize(svg_path, png_path, final_size=FINAL_SIZE, supersample=SUPERSAMPLE):
    """Render at high resolution with crisp edges, then downscale with
    high-quality resampling. This keeps modules perfectly crisp (reliable
    decoding) while the final image still looks smooth, not pixelated."""
    import cairosvg
    from PIL import Image

    tmp_path = png_path + ".tmp.png"
    cairosvg.svg2png(url=svg_path, write_to=tmp_path, output_width=supersample, output_height=supersample)
    img = Image.open(tmp_path).convert("RGB")
    img = img.resize((final_size, final_size), Image.LANCZOS)
    img.save(png_path)
    os.remove(tmp_path)


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

    png_path = os.path.join(OUTPUT, "qr-bare.png")
    rasterize(svg_path, png_path)

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

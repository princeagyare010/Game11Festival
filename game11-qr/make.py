#!/usr/bin/env python3
"""
Regenerates everything - the bare QR (SVG + PNG) and the branded card -
for one target URL. This is the only command you need to run.

Usage:
    python3 make.py "https://your-real-domain.com/"

If you don't pass a URL, it uses the placeholder https://game11festival.com/
"""

import sys

import generate_card
import generate_qr

DEFAULT_URL = "https://game11festival.com/"


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL

    sys.argv = ["generate_qr.py", url]
    generate_qr.main()

    print()
    sys.argv = ["generate_card.py", url]
    generate_card.main()


if __name__ == "__main__":
    main()

#!/usr/bin/env sh
# build-pwa-icons.sh — SPEC-REVISIT-001 REQ-RV-003 maskable raster icon builder.
#
# Generates the 192x192 and 512x512 maskable PNG icons that the PWA manifest
# requires, from the existing vector source assets/app-icon.svg.
#
# This script was NOT run at SPEC-REVISIT-001 authoring time: the build
# environment had no SVG raster tooling (rsvg-convert / ImageMagick / inkscape).
# See assets/PWA-ICONS-TODO.md. Run this on any machine that has one of those
# tools, then add the two PNGs to the manifest icons array and commit.
#
# Usage:  sh scripts/build-pwa-icons.sh
#
# After it succeeds, add to manifest.webmanifest "icons":
#   { "src": "/assets/app-icon-192.png", "sizes": "192x192",
#     "type": "image/png", "purpose": "any maskable" },
#   { "src": "/assets/app-icon-512.png", "sizes": "512x512",
#     "type": "image/png", "purpose": "any maskable" }
set -eu

cd "$(dirname "$0")/.."
SRC="assets/app-icon.svg"
[ -f "$SRC" ] || { echo "ERROR: $SRC not found" >&2; exit 1; }

render() { # render <size>
  size="$1"
  out="assets/app-icon-${size}.png"
  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$size" -h "$size" "$SRC" -o "$out"
  elif command -v magick >/dev/null 2>&1; then
    magick -background none -density 600 "$SRC" -resize "${size}x${size}" "$out"
  elif command -v convert >/dev/null 2>&1; then
    convert -background none -density 600 "$SRC" -resize "${size}x${size}" "$out"
  elif command -v inkscape >/dev/null 2>&1; then
    inkscape "$SRC" --export-type=png --export-width="$size" \
      --export-height="$size" --export-filename="$out"
  else
    echo "ERROR: no SVG raster tool (rsvg-convert/magick/convert/inkscape)" >&2
    echo "Install one, then re-run. See assets/PWA-ICONS-TODO.md" >&2
    exit 2
  fi
  echo "wrote $out"
}

render 192
render 512
echo "Done. Now add the two PNG entries to manifest.webmanifest icons[]."

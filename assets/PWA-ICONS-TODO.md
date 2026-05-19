# PWA maskable raster icons — outstanding TODO (SPEC-REVISIT-001 REQ-RV-003)

## Status: NOT COMPLETE — image tooling unavailable at authoring time

REQ-RV-003 / AC-3 require the manifest `icons` array to include a **maskable
raster PNG at 192×192 and at 512×512**. These PNG files were **not generated**
during SPEC-REVISIT-001 implementation because the build environment had **no
SVG rasterization tool**:

```
rsvg-convert : NOT FOUND
convert      : NOT FOUND   (ImageMagick)
magick       : NOT FOUND   (ImageMagick 7)
inkscape     : NOT FOUND
```

Per the SPEC-REVISIT-001 task constraint, broken icon files were **not
fabricated**. The manifest currently declares the existing, reachable vector
icon `/assets/app-icon.svg` only — that entry is valid and the manifest is
valid JSON, so the PWA still installs, but it does not yet satisfy the
maskable-raster requirement.

## What exists

- `assets/app-icon.svg` — the maskable vector source (512×512 viewBox, wordmark
  inside the 80% safe zone, full-bleed `#3a322a` background). This is the single
  source of truth for the raster icons.
- `scripts/build-pwa-icons.sh` — generator that produces the two PNGs from the
  SVG using whichever rasterizer is available.

## How to finish (one-time, on a machine with image tooling)

1. Install a rasterizer, e.g. `apt-get install librsvg2-bin` (`rsvg-convert`)
   or `brew install librsvg`, or use ImageMagick / Inkscape.
2. Run the generator:

   ```sh
   sh scripts/build-pwa-icons.sh
   ```

   This writes `assets/app-icon-192.png` and `assets/app-icon-512.png`.

3. Add the two PNG entries to `manifest.webmanifest` `"icons"` (before the SVG
   entry so installers prefer the raster):

   ```json
   { "src": "/assets/app-icon-192.png", "sizes": "192x192",
     "type": "image/png", "purpose": "any maskable" },
   { "src": "/assets/app-icon-512.png", "sizes": "512x512",
     "type": "image/png", "purpose": "any maskable" }
   ```

4. Commit the two PNGs and the manifest change. Re-run `npm run lighthouse` to
   confirm the PWA installability audit passes (REQ-RV-019 / AC-18).

Until step 4 is done, AC-3 and the maskable-raster portion of the S4→S5 gate
condition 1 remain **unmet**.

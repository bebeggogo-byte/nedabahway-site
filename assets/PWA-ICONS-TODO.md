# PWA maskable raster icons — resolved (SPEC-REVISIT-001 REQ-RV-003)

## Status: COMPLETE (2026-09-25)

The maskable raster icons now exist and are listed in `manifest.webmanifest`:

- `assets/app-icon-192.png` (192×192, `any maskable`)
- `assets/app-icon-512.png` (512×512, `any maskable`)
- `assets/app-icon.svg` (vector, `any`)

They use the NEDABAHWAY brand v2 six-color symbol on the `#f1ede5` paper
background, with the symbol kept inside the 80% maskable safe zone
(see `.moai/project/brand/visual-identity-v2.md`). They were rendered from
`assets/brand/nw-symbol.png` with Pillow, so `scripts/build-pwa-icons.sh`
(an SVG rasterizer wrapper) is no longer needed to produce them.

Also added: `/favicon.ico` (16/32/48) and `/apple-touch-icon.png` (180×180)
at the site root, which browsers request without a `<link>` tag.

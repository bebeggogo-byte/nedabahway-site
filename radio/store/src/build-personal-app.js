// Assemble a self-contained web bundle for the PERSONAL Capacitor build.
// Output: radio/.appdist/ (gitignored). Personal/offline use only — do not distribute.
//
// Bundles the FULL radio app (radio/index.html + app.js) — the version with the
// refined play/pause state machine, call-interruption handling, lock-screen fixes,
// sleep fade, geo auto-select, autoplay and the in-app intro sheet — not radio/mvp/.
//
// Site-wide CSS linked via absolute "/assets/*.css" is copied into the bundle and
// re-linked relatively so the app resolves everything from its own root. Those
// files only @import web fonts from CDNs (no local url() refs), so the bundle
// degrades to system fonts when offline instead of breaking.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'radio');
const OUT = path.join(ROOT, 'radio/.appdist');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

// Site-wide stylesheets: /assets/X.css -> ./assets/X.css (copied into the bundle)
const cssRefs = new Set();
html = html.replace(/href="\/assets\/([^"]+\.css)"/g, (_, file) => {
  cssRefs.add(file);
  return `href="./assets/${file}"`;
});
for (const file of cssRefs) {
  const from = path.join(ROOT, 'assets', file);
  if (!fs.existsSync(from)) {
    console.warn('warning: referenced stylesheet not found, skipping:', file);
    continue;
  }
  fs.copyFileSync(from, path.join(OUT, 'assets', file));
}

// Guard: nothing absolute-rooted should remain (would 404 inside the native app)
const leftover = html.match(/(?:href|src)="\/(?!\/)[^"]*"/g);
if (leftover) {
  console.warn('warning: absolute-rooted refs remain (may 404 in-app):', leftover.join(', '));
}

// Native media session (Android): the WebView has no Media Session API, so bundle the
// Capacitor core runtime + @jofr/capacitor-media-session (IIFE builds) ahead of app.js.
// app.js detects `window.capacitorMediaSession` and routes lock-screen / headset
// controls and the background foreground-service through the plugin. Skipped when the
// packages are not installed (e.g. an iOS-only setup) — the Web API is used instead.
const VENDOR = [
  ['@capacitor/core/dist/capacitor.js', 'capacitor.js'],
  ['@jofr/capacitor-media-session/dist/plugin.js', 'media-session.js'],
];
const vendorTags = [];
for (const [pkgPath, outName] of VENDOR) {
  const from = path.join(ROOT, 'node_modules', pkgPath);
  if (!fs.existsSync(from)) { console.warn('note: not installed, skipping vendor script:', pkgPath); vendorTags.length = 0; break; }
  fs.mkdirSync(path.join(OUT, 'vendor'), { recursive: true });
  fs.copyFileSync(from, path.join(OUT, 'vendor', outName));
  vendorTags.push(`<script src="./vendor/${outName}"></script>`);
}
if (vendorTags.length === VENDOR.length) {
  html = html.replace('<script src="./app.js"></script>', vendorTags.join('\n') + '\n<script src="./app.js"></script>');
  console.log('vendor: bundled Capacitor core + media-session plugin');
}

fs.writeFileSync(path.join(OUT, 'index.html'), html);

// App logic + data + PWA files (all referenced relatively from index.html)
for (const f of ['app.js', 'stations.json', 'manifest.json', 'sw.js']) {
  fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
}

// Icons
for (const f of fs.readdirSync(path.join(SRC, 'icons'))) {
  if (f.endsWith('.png')) fs.copyFileSync(path.join(SRC, 'icons', f), path.join(OUT, 'icons', f));
}

console.log('built self-contained bundle at', path.relative(ROOT, OUT));
console.log('files:', fs.readdirSync(OUT).join(', '));
console.log('assets:', fs.readdirSync(path.join(OUT, 'assets')).join(', '));

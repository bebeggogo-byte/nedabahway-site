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

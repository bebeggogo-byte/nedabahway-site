// Assemble a self-contained web bundle for the PERSONAL Capacitor build.
// Output: radio/.appdist/ (gitignored). Personal/offline use only — do not distribute.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'radio');
const OUT = path.join(ROOT, 'radio/.appdist');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// index.html: rewrite ../ asset references to ./ so they resolve at bundle root
let html = fs.readFileSync(path.join(SRC, 'mvp/index.html'), 'utf8');
html = html.split('../stations.json').join('./stations.json')
           .split('../icons/').join('./icons/');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// data + PWA files
fs.copyFileSync(path.join(SRC, 'stations.json'), path.join(OUT, 'stations.json'));
for (const f of ['manifest.webmanifest', 'sw.js']) {
  fs.copyFileSync(path.join(SRC, 'mvp', f), path.join(OUT, f));
}

// icons
for (const f of fs.readdirSync(path.join(SRC, 'icons'))) {
  if (f.endsWith('.png')) fs.copyFileSync(path.join(SRC, 'icons', f), path.join(OUT, 'icons', f));
}

console.log('built self-contained bundle at', path.relative(ROOT, OUT));
console.log('files:', fs.readdirSync(OUT).join(', '));

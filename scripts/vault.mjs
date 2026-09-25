#!/usr/bin/env node
/**
 * vault.mjs — lock the old site behind a password (static-site encryption).
 *
 *   VAULT_PASSWORD=... node scripts/vault.mjs encrypt   # lock every private page
 *   VAULT_PASSWORD=... node scripts/vault.mjs decrypt   # restore plaintext locally
 *   node scripts/vault.mjs list                          # show what would be locked
 *
 * Private = every .html tracked by git except the public set in
 * scripts/vault-public.txt and the folders that never deploy. A locked page is
 * a small loader (assets/vault.js) plus base64(iv || AES-256-GCM(deflate(html))).
 * The key is PBKDF2-SHA256(password, SALT, 200k). The password is never written
 * anywhere; keep it outside the repo. SALT must match assets/vault.js.
 *
 * Re-running encrypt skips pages that are already locked. Run it after any
 * build step that regenerates private pages (resources/_build/render_all.py,
 * _build/apply_global_nav.py, ...), otherwise those pages come back public.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const SALT = Buffer.from('15f2ff39a12774b48602e772f7455327', 'hex');
const MARK = '<meta name="nw-vault" content="1">';
const NEVER_DEPLOYED = /^(_archive|\.moai|\.claude|\.github|quant|swarm|trading|vault|node_modules|_build|radio\/store|radio\/mvp|resources\/_console|resources\/_data|resources\/_build|blog\/perspective\/_archive_v2_20|blog\/perspective\/perspective_old_129)\//;

const mode = process.argv[2];
if (!['encrypt', 'decrypt', 'list'].includes(mode)) {
  console.error('usage: VAULT_PASSWORD=... node scripts/vault.mjs encrypt|decrypt|list');
  process.exit(2);
}

const pub = new Set(
  readFileSync('scripts/vault-public.txt', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
);
const tracked = execSync('git -c core.quotepath=off ls-files -z -- "*.html"', { maxBuffer: 1 << 28 })
  .toString('utf8').split('\0').filter(Boolean);
const targets = tracked.filter((p) => !NEVER_DEPLOYED.test(p) && !pub.has(p));

if (mode === 'list') {
  targets.forEach((p) => console.log(p));
  console.error(`${targets.length} private pages, ${pub.size} public`);
  process.exit(0);
}

const password = process.env.VAULT_PASSWORD;
if (!password) { console.error('VAULT_PASSWORD is not set'); process.exit(2); }
const key = pbkdf2Sync(password, SALT, 200000, 32, 'sha256');

function loader(payload) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
${MARK}
<title>비공개 자료실 | 네다바웨이</title>
<meta name="theme-color" content="#f1ede5">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/vault.css">
<script src="/assets/vault.js" defer></script>
</head>
<body>
<header class="nw-lock__head"><a href="/" aria-label="네다바웨이 홈"><img src="/assets/brand/nw-wordmark-color.png" width="1128" height="180" alt="NEDABAHWAY"></a></header>
<main id="main" class="nw-lock__main">
<div id="nw-lock" class="nw-lock" hidden>
<h1>비공개 자료실</h1>
<p>이 페이지는 잠겨 있습니다. 비밀번호를 입력하면 열립니다.</p>
<form autocomplete="off">
<label for="nw-pw">비밀번호</label>
<input id="nw-pw" type="password" autocomplete="current-password" required>
<label class="nw-lock__remember"><input type="checkbox" checked> 이 기기에서 기억하기</label>
<p class="nw-lock__err" hidden></p>
<button type="submit">열기</button>
</form>
<p class="nw-lock__back"><a href="/">공개 사이트로 돌아가기</a></p>
</div>
<noscript><p class="nw-lock__err">JavaScript가 필요합니다.</p></noscript>
</main>
<script type="text/plain" id="nw-vault-data">${payload}</script>
</body>
</html>
`;
}

function encryptHtml(html) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(deflateRawSync(Buffer.from(html, 'utf8'), { level: 9 })), c.final(), c.getAuthTag()]);
  return Buffer.concat([iv, ct]).toString('base64');
}

function decryptHtml(b64) {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12), tag = buf.subarray(buf.length - 16), ct = buf.subarray(12, buf.length - 16);
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return inflateRawSync(Buffer.concat([d.update(ct), d.final()])).toString('utf8');
}

let done = 0, skipped = 0, inBytes = 0, outBytes = 0;
for (const p of targets) {
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  const locked = src.includes(MARK);
  if (mode === 'encrypt') {
    if (locked) { skipped++; continue; }
    const out = loader(encryptHtml(src));
    inBytes += Buffer.byteLength(src); outBytes += Buffer.byteLength(out);
    writeFileSync(p, out); done++;
  } else {
    if (!locked) { skipped++; continue; }
    const m = src.match(/<script type="text\/plain" id="nw-vault-data">([^<]*)<\/script>/);
    if (!m) { console.error('no payload:', p); continue; }
    try { writeFileSync(p, decryptHtml(m[1])); done++; }
    catch { console.error('wrong password or corrupt payload:', p); process.exit(1); }
  }
}
console.error(`${mode}: ${done} pages, ${skipped} skipped` + (mode === 'encrypt' ? `, ${(inBytes / 1e6).toFixed(1)}MB -> ${(outBytes / 1e6).toFixed(1)}MB` : ''));

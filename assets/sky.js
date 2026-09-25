/* sky.js — header menu, rotating ask-bar placeholders, scroll reveal,
   and the isometric "night city" hero canvas for sky.css pages. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hamburger menu ---- */
  var head = document.querySelector('.sk-head');
  var burger = document.querySelector('.sk-burger');
  if (head && burger) {
    burger.addEventListener('click', function () {
      var open = head.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    head.querySelectorAll('.sk-nav a').forEach(function (a) {
      a.addEventListener('click', function () { head.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---- ask bar: rotating placeholder + submit to contact page ---- */
  document.querySelectorAll('.ask').forEach(function (form) {
    var input = form.querySelector('.ask__input');
    var list = (form.getAttribute('data-examples') || '').split('|').filter(Boolean);
    if (input && list.length > 1 && !reduce) {
      var i = 0;
      setInterval(function () {
        if (document.activeElement === input || input.value) return;
        input.classList.add('is-fading');
        setTimeout(function () {
          i = (i + 1) % list.length;
          input.setAttribute('placeholder', list[i]);
          input.classList.remove('is-fading');
        }, 350);
      }, 3200);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = (input.value || input.getAttribute('placeholder') || '').trim();
      window.location.href = '/contact.html?msg=' + encodeURIComponent(msg) + '#consult-form';
    });
  });

  /* ---- scroll reveal ---- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- hero canvas: isometric blocks with glowing gold paths ---- */
  var cv = document.querySelector('.sk-hero__bg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var W, H, dpr, blocks, pulses, tile, ox, oy, N = 22;

  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tile = Math.max(W * 1.25, H * 1.1) / 7;
    ox = W / 2; oy = -tile * 2.2;
    blocks = [];
    for (var gx = 0; gx < N; gx++) {
      for (var gy = 0; gy < N; gy++) {
        if (gx % 4 === 0 || gy % 4 === 0) continue; // streets
        var r = rnd(gx * 131 + gy * 17);
        if (r < 0.12) continue;
        var h = tile * (0.35 + Math.pow(rnd(gx * 7 + gy * 311), 2.2) * 3.2);
        blocks.push({ x: gx, y: gy, h: h, lit: rnd(gx * 3 + gy * 5) });
      }
    }
    blocks.sort(function (a, b) { return (a.x + a.y) - (b.x + b.y); });
    pulses = [];
    for (var k = 0; k < 18; k++) pulses.push(newPulse(k));
  }

  function iso(x, y, z) { return [ox + (x - y) * tile * 0.5, oy + (x + y) * tile * 0.29 - (z || 0)]; }

  function newPulse(seed) {
    var horiz = rnd(seed * 13 + Date.now() % 997) > 0.5;
    var lane = 4 * Math.floor(rnd(seed * 29 + Date.now() % 331) * (N / 4));
    return { horiz: horiz, lane: lane, t: -rnd(seed * 3) * N, speed: 0.025 + rnd(seed * 41) * 0.05, len: 2 + rnd(seed * 7) * 4 };
  }

  function drawStreets() {
    ctx.save();
    for (var l = 0; l <= N; l += 4) {
      var a = iso(l, 0), b = iso(l, N), c = iso(0, l), d = iso(N, l);
      ctx.strokeStyle = 'rgba(255,184,58,.55)'; ctx.lineWidth = 2; ctx.shadowColor = '#ffb53a'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPulses() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    pulses.forEach(function (p, i) {
      var s = p.t, e = p.t + p.len;
      var A = p.horiz ? iso(s, p.lane) : iso(p.lane, s);
      var B = p.horiz ? iso(e, p.lane) : iso(p.lane, e);
      var g = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
      g.addColorStop(0, 'rgba(255,190,60,0)'); g.addColorStop(1, 'rgba(255,200,80,.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.shadowColor = '#ffb53a'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      p.t += p.speed;
      if (p.t > N + 2) pulses[i] = newPulse(i + Math.random() * 100);
    });
    ctx.restore();
  }

  function drawBlock(b, time) {
    var x = b.x + 0.12, y = b.y + 0.12, s = 0.76, h = b.h;
    var p1 = iso(x, y + s), p2 = iso(x + s, y + s), p3 = iso(x + s, y), t0 = iso(x, y, h), t1 = iso(x, y + s, h), t2 = iso(x + s, y + s, h), t3 = iso(x + s, y, h);
    // left face
    ctx.fillStyle = '#2a2f3d';
    ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p1[0], p1[1]); ctx.closePath(); ctx.fill();
    // right face
    ctx.fillStyle = '#161a25';
    ctx.beginPath(); ctx.moveTo(t2[0], t2[1]); ctx.lineTo(t3[0], t3[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.fill();
    // roof
    ctx.fillStyle = '#4a5061';
    ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(t3[0], t3[1]); ctx.closePath(); ctx.fill();
    // windows on the left face
    if (b.lit > 0.5) {
      var rows = Math.floor(h / (tile * 0.12)), cols = 4;
      for (var r = 1; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var on = rnd(b.x * 97 + b.y * 13 + r * 7 + c) + Math.sin(time * 0.0004 + b.x + r) * 0.08;
          if (on < 0.62) continue;
          var fx = (c + 0.5) / cols, fz = r / rows;
          var wx = t1[0] + (t2[0] - t1[0]) * fx, wy = t1[1] + (t2[1] - t1[1]) * fx + h * fz;
          ctx.fillStyle = 'rgba(255,196,90,' + (0.35 + (on - 0.62) * 1.4).toFixed(2) + ')';
          ctx.fillRect(wx - 2.5, wy - 3, 5, 6);
        }
      }
    }
  }

  var last = 0, drift = 0;
  function frame(time) {
    if (time - last < 33 && !reduce) { requestAnimationFrame(frame); return; }
    last = time;
    drift += reduce ? 0 : 0.15;
    ox = W / 2 + Math.sin(drift * 0.01) * tile * 0.6;
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);
    drawStreets();
    drawPulses();
    blocks.forEach(function (b) { drawBlock(b, time); });
    if (!reduce) requestAnimationFrame(frame);
  }

  build();
  window.addEventListener('resize', function () { build(); if (reduce) frame(0); });
  requestAnimationFrame(frame);
})();

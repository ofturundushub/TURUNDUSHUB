(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('y').textContent = new Date().getFullYear();

  // Smooth scrolling
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0, { force: true }); return; }
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -20, force: true }); }
      });
    });
  }

  // Mobile menu
  const menuBtn = document.querySelector('.menu-btn');
  const mnav = document.getElementById('mnav');
  if (menuBtn && mnav) {
    const setMenu = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Sulge menüü' : 'Ava menüü');
      document.body.classList.toggle('menu-open', open);
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open) {
        mnav.hidden = false;
        requestAnimationFrame(() => mnav.classList.add('open'));
      } else {
        mnav.classList.remove('open');
        setTimeout(() => { if (!mnav.classList.contains('open')) mnav.hidden = true; }, 300);
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    mnav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });
  }

  // Split scroll-lit paragraphs into words
  const lit = [];
  document.querySelectorAll('.reveal-words').forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      p.appendChild(s);
      if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
    });
    lit.push(p);
  });

  // Glow follows cursor with easing, drifts on its own
  const glow = document.querySelector('.glow');
  let tx = window.innerWidth * 0.55, ty = window.innerHeight * 0.3, gx = tx, gy = ty;
  window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  const bar = document.querySelector('.progress span');
  const steps = document.querySelector('.steps');

  const tick = (time) => {
    // progress bar
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const sp = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleY(${sp})`;

    // scroll-lit words
    const vh = window.innerHeight;
    lit.forEach((p) => {
      const r = p.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.3 + r.height * 0.4)));
      const words = p.children;
      const n = Math.floor(t * words.length);
      for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    });

    // process lines
    if (steps && steps.getBoundingClientRect().top < vh * 0.8) steps.classList.add('in');

    // glow
    if (!reduce) {
      const s = time / 1000;
      const dx = Math.sin(s * 0.35) * 80, dy = Math.cos(s * 0.27) * 60;
      gx += (tx - gx) * 0.045; gy += (ty - gy) * 0.045;
      const size = glow.offsetWidth;
      glow.style.transform = `translate3d(${gx - size / 2 + dx}px, ${gy - size / 2 + dy}px, 0)`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Contact form: fold into a paper plane and fly away
  const form = document.querySelector('form.form');
  const sent = document.querySelector('.sent');
  const errBox = form && form.querySelector('.form-error');
  if (form && sent) {
    // Web3Forms: sends each request to the company inbox
    const post = (fd) => {
      if (fd.get('botcheck')) return Promise.resolve();
      fd.delete('botcheck');
      fd.delete('redirect');
      const data = Object.fromEntries(fd.entries());
      data.replyto = data.email;
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()).then((j) => { if (!j.success) throw new Error(j.message || 'error'); });
    };

    const showSent = () => {
      form.hidden = true;
      sent.hidden = false;
      sent.classList.add('in');
      sent.focus({ preventScroll: true });
    };

    // Paper plane: real folds with 3D flaps, one step at a time
    const W = 240, H = 320;
    const F = '#ffffff', B = '#d6dff3';
    const poly = (pts) => 'polygon(' + pts.map(([x, y]) => `${x}px ${y}px`).join(',') + ')';
    const piece = (parent, pts, color) => {
      const d = document.createElement('div');
      d.className = 'pp-piece';
      d.style.clipPath = poly(pts);
      d.style.background = color;
      parent.appendChild(d);
      return d;
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fold = (parent, f, dur, delay = 0) => {
      const wrap = document.createElement('div');
      wrap.className = 'pp-fold';
      wrap.style.transformOrigin = `${f.origin[0]}px ${f.origin[1]}px`;
      piece(wrap, f.region, F);
      (f.layers || []).forEach((l) => piece(wrap, l, B));
      const cover = piece(wrap, f.region, B);
      cover.style.opacity = 0;
      parent.appendChild(wrap);
      const [ax, ay] = f.axis, ang = f.angle || 180;
      const easing = 'cubic-bezier(.65,0,.35,1)';
      const a = wrap.animate([
        { transform: `perspective(900px) rotate3d(${ax},${ay},0,0deg)`, filter: 'brightness(1)' },
        { transform: `perspective(900px) rotate3d(${ax},${ay},0,${ang / 2}deg)`, filter: 'brightness(.78)', offset: .5 },
        { transform: `perspective(900px) rotate3d(${ax},${ay},0,${ang}deg)`, filter: 'brightness(1)' },
      ], { duration: dur, delay, easing, fill: 'forwards' });
      if (ang >= 180) {
        cover.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1, offset: .5 }, { opacity: 1 }],
          { duration: dur, delay, easing, fill: 'forwards' });
      }
      return a.finished;
    };
    const stage = (paper, build) => {
      const layer = document.createElement('div');
      layer.className = 'pp-layer';
      paper.appendChild(layer);
      const old = [...paper.children].filter((c) => c !== layer);
      const p = build(layer);
      old.forEach((c) => c.remove());
      return p;
    };

    const fly = async (rect) => {
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const scale = Math.min(1.1, (rect.width * 0.5) / W, (window.innerHeight * 0.6) / H);
      const stageEl = document.createElement('div');
      stageEl.className = 'pp-stage';
      stageEl.style.cssText = `left:${cx - W / 2}px;top:${cy - H / 2}px`;
      const paper = document.createElement('div');
      paper.className = 'pp-paper';
      stageEl.appendChild(paper);
      document.body.appendChild(stageEl);

      // the sheet appears
      await stageEl.animate([
        { opacity: 0, transform: `scale(${scale * 1.25})` },
        { opacity: 1, transform: `scale(${scale})` },
      ], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished;

      // 1) top corners to the centre line
      await stage(paper, (l) => {
        piece(l, [[120, 0], [240, 120], [240, 320], [0, 320], [0, 120]], F);
        return Promise.all([
          fold(l, { region: [[0, 0], [120, 0], [0, 120]], origin: [120, 0], axis: [-1, 1] }, 220),
          fold(l, { region: [[120, 0], [240, 0], [240, 120]], origin: [120, 0], axis: [-1, -1] }, 220, 30),
        ]);
      });
      await wait(20);

      // 2) the new edges to the centre line again
      await stage(paper, (l) => {
        piece(l, [[120, 0], [240, 290], [240, 320], [0, 320], [0, 290]], F);
        piece(l, [[120, 0], [120, 120], [70.3, 120]], B);
        piece(l, [[120, 0], [120, 120], [169.7, 120]], B);
        return Promise.all([
          fold(l, { region: [[120, 0], [0, 120], [0, 290]], layers: [[[120, 0], [70.3, 120], [0, 120]]], origin: [120, 0], axis: [-120, 290] }, 220),
          fold(l, { region: [[120, 0], [240, 120], [240, 290]], layers: [[[120, 0], [169.7, 120], [240, 120]]], origin: [120, 0], axis: [-120, -290] }, 220, 30),
        ]);
      });
      await wait(20);

      // 3) fold in half along the centre
      await stage(paper, (l) => {
        piece(l, [[120, 0], [120, 320], [0, 320], [0, 290]], F);
        piece(l, [[120, 0], [120, 170], [0, 290]], B);
        return fold(l, { region: [[120, 0], [240, 290], [240, 320], [120, 320]], layers: [[[120, 0], [240, 290], [120, 170]]], origin: [120, 0], axis: [0, -1] }, 240);
      });
      

      // 4) wings open into a real paper plane, then it flies off with a blue trail
      const plane = document.createElement('div');
      plane.className = 'pp-plane';
      const PW = 200 * scale * 0.85, PH = PW * 0.6;
      plane.style.cssText = `width:${PW}px;height:${PH}px;left:${cx - PW / 2}px;top:${cy - PH / 2}px`;
      plane.innerHTML = '<div class="pp-trail"></div>' +
        '<svg viewBox="0 0 200 120" aria-hidden="true">' +
        '<polygon points="196,58 6,12 80,61" fill="#dde5f7"/>' +
        '<polygon points="196,58 80,61 98,84" fill="#a9bbe8"/>' +
        '<polygon points="196,58 80,61 28,108" fill="#ffffff"/>' +
        '<line x1="196" y1="58" x2="80" y2="61" stroke="#2f6bff" stroke-width="1.4"/>' +
        '</svg>';
      document.body.appendChild(plane);
      stageEl.animate([
        { transform: `scale(${scale})`, opacity: 1 },
        { transform: `rotate(90deg) scale(${scale * 0.5})`, opacity: 0 },
      ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
      await plane.animate([
        { transform: 'rotate(-40deg) scale(.35, .1)', opacity: 0 },
        { transform: 'rotate(4deg) scale(1, 1)', opacity: 1 },
      ], { duration: 200, delay: 60, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }).finished;

      const trail = plane.querySelector('.pp-trail');
      trail.animate([
        { opacity: 0, transform: 'scaleX(0)' },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.35 },
        { opacity: 1, transform: 'scaleX(1.5)' },
      ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
      // smooth path: small dip, then a gentle curve out to the top right
      const L1 = Math.min(260, window.innerWidth * 0.2), h1 = 40;
      const R = Math.max(60, Math.min(110, window.innerHeight * 0.14));
      const ex = window.innerWidth - cx + 300, ey = -(cy + 260);
      const cub = (p0, p1, p2, p3, t) => {
        const u = 1 - t;
        return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
      };
      const pts = [];
      for (let i = 0; i <= 60; i++) pts.push(cub([0, 0], [L1 * 0.3, 30], [L1 * 0.6, -h1], [L1, -h1], i / 60));
      for (let i = 1; i <= 80; i++) pts.push(cub([L1, -h1], [L1 + 220, -h1], [ex - 220, ey + 160], [ex, ey], i / 80));
      // resample evenly by distance so the speed is steady
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = cum[cum.length - 1], N = 200, P = [];
      let j = 0;
      for (let n = 0; n <= N; n++) {
        const d = (n / N) * total;
        while (j < cum.length - 2 && cum[j + 1] < d) j++;
        const f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
        P.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
      }
      // smooth heading: central difference, unwrapped, then averaged
      const raw = [];
      for (let n = 0; n <= N; n++) {
        const a = P[Math.max(0, n - 3)], b = P[Math.min(N, n + 3)];
        let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        if (n) { const pr = raw[n - 1]; while (ang - pr > 180) ang -= 360; while (ang - pr < -180) ang += 360; }
        raw.push(ang);
      }
      const kf = [];
      for (let n = 0; n <= N; n++) {
        let sum = 0, c = 0;
        for (let k = -4; k <= 4; k++) { const m = n + k; if (m >= 0 && m <= N) { sum += raw[m]; c++; } }
        const ang = sum / c;
        const t = n / N;
        const sc = 1 - 0.45 * Math.max(0, (t - 0.65) / 0.35);
        kf.push({ transform: `translate(${P[n][0].toFixed(1)}px, ${P[n][1].toFixed(1)}px) rotate(${(ang - 8).toFixed(2)}deg) scale(${sc.toFixed(3)})`, offset: t });
      }
      kf[0].transform = 'translate(0px, 0px) rotate(4deg) scale(1)';
      plane.style.filter = 'none';
      trail.getAnimations().forEach((a) => a.cancel());
      trail.animate([
        { opacity: 0, transform: 'scaleX(0)' },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.2 },
        { opacity: 1, transform: 'scaleX(1.5)' },
      ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
      await plane.animate(kf, { duration: 800, easing: 'cubic-bezier(.45,0,.75,.75)', fill: 'forwards' }).finished;
      plane.remove();
      stageEl.remove();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      // one line for chosen services, and a unique subject so Gmail keeps every request separate
      const services = fd.getAll('teenus');
      fd.delete('teenus');
      fd.set('teenus', services.length ? services.join(', ') : '-');
      const now = new Date();
      const stamp = now.toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit' }) + ' ' +
        now.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit' });
      const who = (fd.get('nimi') || '').toString().trim();
      const firm = (fd.get('ettevote') || '').toString().trim();
      fd.set('subject', `Uus päring: ${who}${firm ? ' (' + firm + ')' : ''} · ${stamp}`);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      if (errBox) errBox.hidden = true;

      const request = post(fd);
      if (reduce) {
        request.then(showSent).catch(() => { btn.disabled = false; errBox.hidden = false; });
        return;
      }
      const rect = form.getBoundingClientRect();
      form.classList.add('folding');
      const anim = fly(rect);
      Promise.allSettled([request, anim]).then(([res]) => {
        if (res.status === 'fulfilled') { form.reset(); showSent(); }
        else { form.classList.remove('folding'); btn.disabled = false; errBox.hidden = false; }
      });
    });
  }
})();

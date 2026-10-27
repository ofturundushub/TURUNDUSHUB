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
        if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0); return; }
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -20 }); }
      });
    });
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
      const t = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
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
    const encode = (fd) => new URLSearchParams(fd).toString();
    const post = (fd) => fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode(fd),
    }).then((r) => { if (!r.ok) throw new Error(r.status); });

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
      ], { duration: 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished;

      // 1) top corners to the centre line
      await stage(paper, (l) => {
        piece(l, [[120, 0], [240, 120], [240, 320], [0, 320], [0, 120]], F);
        return Promise.all([
          fold(l, { region: [[0, 0], [120, 0], [0, 120]], origin: [120, 0], axis: [-1, 1] }, 380),
          fold(l, { region: [[120, 0], [240, 0], [240, 120]], origin: [120, 0], axis: [-1, -1] }, 380, 60),
        ]);
      });
      await wait(40);

      // 2) the new edges to the centre line again
      await stage(paper, (l) => {
        piece(l, [[120, 0], [240, 290], [240, 320], [0, 320], [0, 290]], F);
        piece(l, [[120, 0], [120, 120], [70.3, 120]], B);
        piece(l, [[120, 0], [120, 120], [169.7, 120]], B);
        return Promise.all([
          fold(l, { region: [[120, 0], [0, 120], [0, 290]], layers: [[[120, 0], [70.3, 120], [0, 120]]], origin: [120, 0], axis: [-120, 290] }, 380),
          fold(l, { region: [[120, 0], [240, 120], [240, 290]], layers: [[[120, 0], [169.7, 120], [240, 120]]], origin: [120, 0], axis: [-120, -290] }, 380, 60),
        ]);
      });
      await wait(40);

      // 3) fold in half along the centre
      await stage(paper, (l) => {
        piece(l, [[120, 0], [120, 320], [0, 320], [0, 290]], F);
        piece(l, [[120, 0], [120, 170], [0, 290]], B);
        return fold(l, { region: [[120, 0], [240, 290], [240, 320], [120, 320]], layers: [[[120, 0], [240, 290], [120, 170]]], origin: [120, 0], axis: [0, -1] }, 400);
      });
      

      // 4) nose first, blue trail behind, and away it goes
      const trail = document.createElement('div');
      trail.className = 'pp-trail';
      stageEl.appendChild(trail);
      const k = scale * 0.6;
      const dx = window.innerWidth - cx + 300, dy = -(cy + 300);
      trail.animate([
        { opacity: 0, transform: 'scaleY(0)' },
        { opacity: 1, transform: 'scaleY(1)', offset: 0.35 },
        { opacity: 1, transform: 'scaleY(1.4)' },
      ], { duration: 1000, delay: 120, easing: 'ease-out', fill: 'forwards' });
      await stageEl.animate([
        { transform: `scale(${scale})` },
        { transform: `translate(10px, 30px) rotate(90deg) scale(${k})`, offset: 0.22 },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.1}px) rotate(76deg) scale(${k * 0.9})`, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) rotate(62deg) scale(${k * 0.55})` },
      ], { duration: 1100, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished;
      stageEl.remove();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
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

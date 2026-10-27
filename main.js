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

    const planeSVG = '<svg viewBox="0 0 120 80" aria-hidden="true">' +
      '<path d="M2 40 L118 4 L70 76 L56 48 Z" fill="#ffffff"/>' +
      '<path d="M56 48 L118 4 L44 44 Z" fill="#d9e3ff"/>' +
      '<path d="M56 48 L60 66 L70 76 Z" fill="#b9c9f5"/>' +
      '<path d="M2 40 L56 48" stroke="#2f6bff" stroke-width="1.2" fill="none"/>' +
      '</svg>';

    const fly = (rect) => new Promise((resolve) => {
      const W = Math.min(300, rect.width * 0.6), H = W * 1.3;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;

      const sheet = document.createElement('div');
      sheet.className = 'paper';
      sheet.style.cssText = `width:${W}px;height:${H}px;left:${cx - W / 2}px;top:${cy - H / 2}px`;
      sheet.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
      document.body.appendChild(sheet);

      const shapes = [
        'polygon(0% 0%, 50% 0%, 100% 0%, 100% 100%, 50% 100%, 0% 100%)',
        'polygon(0% 28%, 50% 0%, 100% 28%, 100% 100%, 50% 100%, 0% 100%)',
        'polygon(18% 45%, 50% 0%, 82% 45%, 82% 100%, 50% 100%, 18% 100%)',
        'polygon(38% 62%, 50% 0%, 62% 62%, 62% 100%, 50% 100%, 38% 100%)',
      ];
      const ease = 'cubic-bezier(.6,0,.3,1)';
      // 1) sheet appears from the form
      sheet.animate([{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      // 2) fold, fold, fold
      const frames = shapes.map((c, i) => ({
        clipPath: c,
        transform: `scale(1) rotate(0deg) rotateY(${i % 2 ? 14 : -14}deg)`,
        offset: (i / (shapes.length - 1)) * 0.8,
      }));
      frames.push({ clipPath: shapes[shapes.length - 1], transform: 'scale(.45) rotate(58deg) rotateY(0deg)', offset: 1 });
      const folds = sheet.animate(frames, { duration: 1300, delay: 420, easing: ease, fill: 'forwards' });

      folds.finished.then(() => {
        // 3) becomes a plane and flies off the screen
        const plane = document.createElement('div');
        plane.className = 'plane';
        plane.innerHTML = planeSVG;
        const pw = 120;
        plane.style.cssText = `width:${pw}px;left:${cx - pw / 2}px;top:${cy - pw / 3}px`;
        document.body.appendChild(plane);
        sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });

        const dx = window.innerWidth - cx + 200, dy = -(cy + 200);
        const a = plane.animate([
          { transform: 'translate(0,0) rotate(-30deg) scale(.6)', opacity: 0 },
          { transform: 'translate(0,0) rotate(-20deg) scale(1)', opacity: 1, offset: 0.14 },
          { transform: `translate(${-dx * 0.08}px, ${30}px) rotate(-8deg) scale(1)`, offset: 0.32 },
          { transform: `translate(${dx * 0.45}px, ${dy * 0.25}px) rotate(-24deg) scale(.85)`, offset: 0.65 },
          { transform: `translate(${dx}px, ${dy}px) rotate(-32deg) scale(.55)`, opacity: 1 },
        ], { duration: 1500, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
        a.finished.then(() => { sheet.remove(); plane.remove(); resolve(); });
      });
    });

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

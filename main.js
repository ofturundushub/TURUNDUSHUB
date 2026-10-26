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
})();

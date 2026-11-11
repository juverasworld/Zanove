(() => {
  const header = document.querySelector('[data-site-header]');
  const toggle = header?.querySelector('[data-menu-toggle]');
  const menu = header?.querySelector('[data-site-menu]');

  if (header && toggle && menu) {
    const links = menu.querySelectorAll('a');
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.setAttribute('aria-hidden', String(!open && window.innerWidth <= 820));
      menu.classList.toggle('is-open', open);
      links.forEach((link) => link.tabIndex = open || window.innerWidth > 820 ? 0 : -1);
    };

    toggle.setAttribute('aria-controls', menu.id);
    setOpen(window.innerWidth > 820);
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.forEach((link) => link.addEventListener('click', () => setOpen(window.innerWidth > 820)));
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target) && window.innerWidth <= 820) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true' && window.innerWidth <= 820) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', () => setOpen(window.innerWidth > 820));
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!revealItems.length) return;

  document.body.classList.add('motion-ready');
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });
  revealItems.forEach((item) => observer.observe(item));
})();

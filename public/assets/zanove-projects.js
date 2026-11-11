(() => {
  const filters = [...document.querySelectorAll('[data-work-filter]')];
  const cards = [...document.querySelectorAll('[data-work-card]')];
  const status = document.querySelector('[data-work-filter-status]');
  if (!filters.length || !cards.length) return;

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.workFilter;
      filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      let shown = 0;
      cards.forEach((card) => {
        const categories = (card.dataset.categories || '').split(/\s+/);
        const visible = selected === 'all' || categories.includes(selected);
        card.hidden = !visible;
        if (visible) shown += 1;
      });
      if (status) status.textContent = `${shown} ${shown === 1 ? 'project' : 'projects'} shown.`;
    });
  });
})();

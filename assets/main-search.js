(() => {
  const init = (root) => {
    root.querySelectorAll('.js-search-quick').forEach((quick) => {
      if (quick.dataset.searchQuickInitialized === 'true') return;
      quick.dataset.searchQuickInitialized = 'true';

      const toggle = quick.querySelector('.js-search-quick-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', () => {
        const isOpen = quick.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    });
  };

  init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();

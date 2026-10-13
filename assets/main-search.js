(() => {
  const routesRoot = () => window.Shopify?.routes?.root || '/';

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const termUrl = (item) => {
    const url = new URL(item.url || `${routesRoot()}search?q=${encodeURIComponent(item.text)}`, window.location.origin);
    url.searchParams.set('type', 'product');
    return `${url.pathname}${url.search}`;
  };

  const loadTerms = async (quick) => {
    const list = quick.querySelector('.js-search-quick-list');
    const query = quick.dataset.query?.trim();
    if (!list || !query) return;

    const limit = Math.min(Math.max(parseInt(quick.dataset.limit, 10) || 3, 1), 10);
    const endpoint = `${routesRoot()}search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=query&resources[limit]=${limit}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Suggest request failed: ${response.status}`);
      const json = await response.json();
      const terms = (json?.resources?.results?.queries || []).slice(0, limit);
      if (!terms.length) return;

      const current = query.toLowerCase();
      list.innerHTML = terms
        .map((item) => {
          const isActive = item.text.trim().toLowerCase() === current;
          return `<a href="${escapeHtml(termUrl(item))}" class="search-header__tag text-reg-12${isActive ? ' is-active' : ''}"${isActive ? ' aria-current="page"' : ''}>${escapeHtml(item.text)}</a>`;
        })
        .join('');
      quick.hidden = false;
    } catch (error) {
      console.warn('[MainSearch] Suggested terms error:', error);
    }
  };

  const init = (root) => {
    root.querySelectorAll('.js-search-quick').forEach((quick) => {
      if (quick.dataset.searchQuickInitialized === 'true') return;
      quick.dataset.searchQuickInitialized = 'true';

      loadTerms(quick);

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

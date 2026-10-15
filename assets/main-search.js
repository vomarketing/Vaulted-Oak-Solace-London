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
    url.searchParams.delete('type');
    return `${url.pathname}${url.search}`;
  };

  const updateSearchLinks = (page, url, searchQuery) => {
    const query = url.searchParams.get('q') || '';
    page.querySelectorAll('.collection-pagination a').forEach((link) => {
      const nextUrl = new URL(link.getAttribute('href'), window.location.origin);
      nextUrl.searchParams.set('q', query);
      nextUrl.searchParams.delete('type');
      nextUrl.searchParams.delete('section_id');
      link.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    });

    const form = document.querySelector('[data-module-drawers-drawer="search-filters"] [data-collection-filter-app-form]');
    const queryInput = form?.querySelector('input[name="q"]');
    if (queryInput) {
      queryInput.value = query;
      form.dataset.searchQuery = searchQuery;
    }
  };

  const preferQuotedResults = async (page, resolvedQuery) => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const query = url.searchParams.get('q')?.trim();
    updateSearchLinks(page, url, resolvedQuery || query || '');
    if (!query || resolvedQuery || (query.startsWith('"') && query.endsWith('"'))) return;

    const quotedQuery = `"${query}"`;
    const sectionUrl = new URL(currentUrl);
    sectionUrl.searchParams.set('q', quotedQuery);
    sectionUrl.searchParams.set('type', 'product');
    sectionUrl.searchParams.set('section_id', page.dataset.sectionId);
    page.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(sectionUrl.href);
      if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
      const nextDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextPage = nextDocument.querySelector('.js-search-page');
      const resultCount = parseInt(nextPage?.dataset.resultsCount, 10) || 0;

      if (resultCount > 0 && page.isConnected && window.location.href === currentUrl) {
        const drawer = document.querySelector('[data-module-drawers-drawer="search-filters"]');
        const nextDrawer = nextPage.querySelector('[data-module-drawers-drawer="search-filters"]');
        if (drawer && nextDrawer) {
          if (page.contains(drawer)) page.after(drawer);
          drawer.replaceChildren(...nextDrawer.childNodes);
          nextDrawer.remove();
        }

        page.replaceChildren(...nextPage.childNodes);
        page.dataset.resultsCount = nextPage.dataset.resultsCount;
        updateSearchLinks(page, url, quotedQuery);
        window.BAO?.application?.reinitialiseModules(page);
        if (drawer) drawer.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true }));
      }
    } catch (error) {
      console.warn('[MainSearch] Quoted search error:', error);
    } finally {
      page.removeAttribute('aria-busy');
    }
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

  const initQuickSearch = (root) => {
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

  const init = (root) => {
    root.querySelectorAll('.js-search-page').forEach(async (page) => {
      if (page.dataset.searchPageInitialized === 'true') return;
      page.dataset.searchPageInitialized = 'true';

      try {
        const url = new URL(window.location.href);
        const query = url.searchParams.get('q')?.trim();
        const quotedQuery = query?.length > 1 && query.startsWith('"') && query.endsWith('"') ? query : null;
        if (quotedQuery) url.searchParams.set('q', quotedQuery.slice(1, -1));
        if (quotedQuery || url.searchParams.has('type')) {
          url.searchParams.delete('type');
          window.history.replaceState(window.history.state, '', url.href);
        }

        await preferQuotedResults(page, quotedQuery);
        if (page.isConnected) initQuickSearch(page);
      } finally {
        page.removeAttribute('data-search-pending');
        page.removeAttribute('aria-busy');
      }
    });
  };

  init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();

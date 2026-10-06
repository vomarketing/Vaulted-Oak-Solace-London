(() => {
  const init = (root) => {
    if (root.dataset.collectionFilterAppInitialized === 'true') return;
    root.dataset.collectionFilterAppInitialized = 'true';

    const form = root.querySelector('[data-collection-filter-app-form]');
    const count = root.querySelector('[data-collection-filter-app-result-count]');
    const submit = root.querySelector('[data-collection-filter-app-submit]');
    const clear = root.querySelector('[data-collection-filter-clear]');
    if (!form || !count || !submit) return;

    const selectedUrl = () => {
      const url = new URL(form.action, window.location.origin);
      for (const [name, value] of new FormData(form)) {
        if (value !== '') url.searchParams.append(name, value);
      }
      return url;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.location.assign(selectedUrl().href);
    });

    if (clear) {
      clear.addEventListener('click', () => {
        form.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
          input.checked = false;
        });
        form.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    let request;
    form.addEventListener('change', async () => {
      if (request) request.abort();
      const controller = new AbortController();
      request = controller;
      submit.setAttribute('aria-busy', 'true');
      count.textContent = '…';

      const url = selectedUrl();
      url.searchParams.set('section_id', form.dataset.sectionId);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Section request failed: ${response.status}`);
        const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
        const nextCount = documentFragment.querySelector('[data-collection-filter-app-result-count]');
        count.textContent = nextCount ? nextCount.textContent : '—';
      } catch (error) {
        if (error.name !== 'AbortError') count.textContent = '—';
      } finally {
        if (!controller.signal.aborted) submit.removeAttribute('aria-busy');
      }
    });
  };

  document.querySelectorAll('[data-collection-filter-app]').forEach(init);
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-collection-filter-app]').forEach(init);
  });
})();

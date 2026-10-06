(() => {
  const init = (root) => {
    if (root.dataset.collectionFilterInitialized === 'true') return;
    root.dataset.collectionFilterInitialized = 'true';

    const form = root.querySelector('[data-collection-filter-form]');
    const count = root.querySelector('[data-collection-filter-result-count]');
    const submit = root.querySelector('[data-collection-filter-submit]');
    const clear = root.querySelector('[data-collection-filter-clear]');
    if (!form || !count || !submit) return;

    const selectedUrl = () => {
      const url = new URL(form.dataset.collectionUrl, window.location.origin);
      const formData = new FormData(form);
      const tagHandles = formData.getAll('filter_tag');
      if (tagHandles.length) {
        url.pathname = `${url.pathname.replace(/\/$/, '')}/${tagHandles.join('+')}`;
      }
      const sort = formData.get('sort_by');
      if (sort) url.searchParams.set('sort_by', sort);
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
        const response = await fetch(url, {signal: controller.signal});
        if (!response.ok) throw new Error(`Section request failed: ${response.status}`);
        const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
        const nextCount = documentFragment.querySelector('[data-collection-filter-result-count]');
        count.textContent = nextCount ? nextCount.textContent : '—';
      } catch (error) {
        if (error.name !== 'AbortError') count.textContent = '—';
      } finally {
        if (!controller.signal.aborted) submit.removeAttribute('aria-busy');
      }
    });
  };

  document.querySelectorAll('[data-collection-filter-v2]').forEach(init);
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-collection-filter-v2]').forEach(init);
  });
})();

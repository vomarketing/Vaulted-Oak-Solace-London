(() => {
  const init = (root) => {
    if (root.dataset.collectionFilterInitialized === 'true') return;
    root.dataset.collectionFilterInitialized = 'true';

    const form = root.querySelector('[data-collection-filter-form]');
    const count = root.querySelector('[data-collection-filter-result-count]');
    const submit = root.querySelector('[data-collection-filter-submit]');
    const clear = root.querySelector('[data-collection-filter-clear]');
    if (!form || !count || !submit) return;

    root.querySelectorAll('.collection-filter-v2__group').forEach((group) => {
      group.addEventListener('toggle', () => {
        if (!group.open) return;
        root.querySelectorAll('.collection-filter-v2__group').forEach((other) => {
          if (other !== group) other.open = false;
        });
      });
    });

    const updateSelectionState = () => {
      const hasSelectedFilter = !!form.querySelector('input[type="checkbox"]:checked');
      const selectedSort = form.querySelector('input[type="radio"][name="sort_by"]:checked');
      const hasSelectedSort = !!selectedSort && selectedSort.value !== form.dataset.defaultSort;
      root.querySelectorAll('.collection-filter-v2__group').forEach((group) => {
        const isSelected = group.classList.contains('collection-filter-v2__group--sort')
          ? hasSelectedSort
          : !!group.querySelector('input[type="checkbox"]:checked');
        group.classList.toggle('has-selection', isSelected);
      });
      if (clear) clear.hidden = !hasSelectedFilter && !hasSelectedSort;
    };
    updateSelectionState();

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
        form.querySelectorAll('input[type="radio"][name="sort_by"]').forEach((input) => {
          input.checked = input.value === form.dataset.defaultSort;
        });
        form.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    let request;
    form.addEventListener('change', async () => {
      updateSelectionState();
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

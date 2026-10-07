/**
 * Predictive Search Web Component (<predictive-search>)
 * Real-time search suggestions, suggested terms, and product previews for Solace London
 * Supports Horizontal Dropdown and Vertical Drawer layouts
 */

if (!customElements.get('predictive-search')) {
  class PredictiveSearch extends HTMLElement {
    static selectors = {
      drawer: '.js-predictive-search-drawer',
      form: '.js-predictive-search-form',
      input: '.js-predictive-search-input',
      close: '.js-predictive-search-close',
      suggested: '.js-predictive-search-suggested',
      suggestedBtn: '.js-predictive-search-suggested-btn',
      noResults: '.js-predictive-search-no-results',
      noResultsQuery: '.js-predictive-search-no-results-query',
      results: '.js-predictive-search-results',
      queries: '.js-predictive-search-queries',
      queryLink: '.js-predictive-search-query-link',
      products: '.js-predictive-search-products',
      viewAll: '.js-predictive-search-view-all'
    };

    static classes = {
      drawerActive: 'drw-Drawer-active',
      drawerHasValue: 'drw-Drawer-searchHasValue',
      card: 'pred-Card',
      onSale: 'prd-Price-onSale',
      kickerRed: 'prd-Card_Kicker-red',
      selected: 'is-selected',
      visible: 'is-visible',
      loading: 'is-loading'
    };

    constructor() {
      super();

      this.selectors = PredictiveSearch.selectors;
      this.classes = PredictiveSearch.classes;

      // DOM elements
      this.drawer = null;
      this.form = null;
      this.input = null;
      this.suggestedEl = null;
      this.noResultsEl = null;
      this.noResultsQueryEl = null;
      this.resultsContainer = null;
      this.queriesList = null;
      this.productsContainer = null;
      this.viewAllLink = null;

      // State & Controllers
      this.abortController = null;
      this.debounceTimer = null;
      this.observer = null;
      this.cache = new Map();
      this.maxCacheEntries = 50;
      this.maxQueries = 3;
      this.maxProducts = 4;
      this.imageWidths = [256, 384, 512, 768];
      this.closeDuration = 450;
      this.resetTimer = null;
      this.isOpen = false;
      this.currentSelectedIndex = -1;
      this.currentQuery = '';

      // Event handlers
      this.onInput = this.handleInput.bind(this);
      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onSubmit = this.handleSubmit.bind(this);
      this.onQueryClick = this.handleQueryClick.bind(this);
      this.onSuggestedClick = this.handleSuggestedClick.bind(this);
    }

    connectedCallback() {
      this.drawer = this.closest(this.selectors.drawer);
      this.form = this.querySelector(this.selectors.form);
      this.input = this.querySelector(this.selectors.input);
      this.suggestedEl = this.querySelector(this.selectors.suggested);
      this.noResultsEl = this.querySelector(this.selectors.noResults);
      this.noResultsQueryEl = this.querySelector(this.selectors.noResultsQuery);
      this.resultsContainer = this.querySelector(this.selectors.results);
      this.queriesList = this.querySelector(this.selectors.queries);
      this.productsContainer = this.querySelector(this.selectors.products);
      this.viewAllLink = this.querySelector(this.selectors.viewAll);

      if (!this.input || !this.form) return;

      this.bindEvents();
      this.setupObserver();
    }

    disconnectedCallback() {
      this.cleanup();
      this.unbindEvents();
    }

    cleanup() {
      clearTimeout(this.resetTimer);
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      const headerEls = document.querySelectorAll('.hd-Header, .lyt-Header');
      headerEls.forEach((el) => el.classList.remove('hd-Header-searchActive'));
      document.body.classList.remove('has-search-active', 'has-horizontal-search-active');
    }

    bindEvents() {
      if (this.input) {
        this.input.addEventListener('input', this.onInput);
        this.input.addEventListener('keydown', this.onKeyDown);
      }
      if (this.form) {
        this.form.addEventListener('submit', this.onSubmit);
      }
      if (this.queriesList) {
        this.queriesList.addEventListener('click', this.onQueryClick);
      }
      if (this.suggestedEl) {
        this.suggestedEl.addEventListener('click', this.onSuggestedClick);
      }
    }

    unbindEvents() {
      if (this.input) {
        this.input.removeEventListener('input', this.onInput);
        this.input.removeEventListener('keydown', this.onKeyDown);
      }
      if (this.form) {
        this.form.removeEventListener('submit', this.onSubmit);
      }
      if (this.queriesList) {
        this.queriesList.removeEventListener('click', this.onQueryClick);
      }
      if (this.suggestedEl) {
        this.suggestedEl.removeEventListener('click', this.onSuggestedClick);
      }
    }

    setupObserver() {
      if (!this.drawer) return;

      const headerEls = document.querySelectorAll('.hd-Header, .lyt-Header');

      this.observer = new MutationObserver(() => {
        const isActive = this.drawer.classList.contains(this.classes.drawerActive);
        if (isActive === this.isOpen) return;
        this.isOpen = isActive;

        const isHorizontal = this.layout === 'horizontal';

        if (isHorizontal) {
          headerEls.forEach((el) => el.classList.toggle('hd-Header-searchActive', isActive));
          document.body.classList.toggle('has-horizontal-search-active', isActive);
        } else {
          headerEls.forEach((el) => el.classList.remove('hd-Header-searchActive'));
          document.body.classList.remove('has-horizontal-search-active');
        }
        document.body.classList.toggle('has-search-active', isActive);

        clearTimeout(this.resetTimer);

        if (isActive) {
          setTimeout(() => {
            if (this.input) {
              this.input.focus();
              const val = this.input.value.trim();
              this.currentQuery = val;
              if (val.length > 0) {
                this.updateValueState(true);
                this.fetchSuggestions(val);
              } else {
                this.updateValueState(false);
                this.showInitialState();
              }
            }
          }, 150);
        } else {
          this.resetTimer = setTimeout(() => {
            this.resetSearch();
            this.updateValueState(false);
          }, this.closeDuration);
        }
      });

      this.observer.observe(this.drawer, { attributes: true, attributeFilter: ['class'] });
    }

    get layout() {
      return this.getAttribute('data-layout') || 'horizontal';
    }

    get searchUrl() {
      return this.getAttribute('data-routes-search') || '/search';
    }

    get currencySymbol() {
      return this.getAttribute('data-currency-symbol') || '£';
    }

    updateValueState(hasValue) {
      if (this.drawer) {
        this.drawer.classList.toggle(this.classes.drawerHasValue, hasValue);
      }
      this.classList.toggle('has-value', hasValue);
    }

    formatPrice(price) {
      if (price == null) return '';
      const num = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
      if (isNaN(num)) return price;
      return `${this.currencySymbol}${num.toFixed(2)}`;
    }

    escapeHtml(unsafe) {
      if (typeof unsafe !== 'string') return '';
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    sanitizeUrl(url) {
      if (!url || typeof url !== 'string') return '#';
      const clean = url.trim();
      if (clean.startsWith('javascript:') || clean.startsWith('data:')) {
        return '#';
      }
      return clean;
    }

    handleInput(e) {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();
      this.currentQuery = query;
      this.clearActiveDescendant();

      const hasValue = query.length > 0;
      this.updateValueState(hasValue);

      if (!hasValue) {
        this.showInitialState();
        return;
      }

      if (this.cache.has(query)) {
        this.renderResults(query, this.cache.get(query));
        return;
      }

      this.showSkeleton(query);

      this.debounceTimer = setTimeout(() => {
        this.fetchSuggestions(query);
      }, 250);
    }

    handleKeyDown(e) {
      if (e.key === 'Escape') {
        const closeBtn = this.drawer ? this.drawer.querySelector(this.selectors.close) : null;
        if (closeBtn) {
          closeBtn.click();
        } else {
          this.closeResults();
        }
        return;
      }

      // Keyboard navigation for query suggestions
      const items = this.queriesList ? this.queriesList.querySelectorAll(this.selectors.queryLink) : [];
      if (!items.length || !this.resultsContainer || this.resultsContainer.style.display === 'none') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.currentSelectedIndex = (this.currentSelectedIndex + 1) % items.length;
        this.updateFocusedQuery(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.currentSelectedIndex = (this.currentSelectedIndex - 1 + items.length) % items.length;
        this.updateFocusedQuery(items);
      } else if (e.key === 'Enter' && this.currentSelectedIndex >= 0) {
        e.preventDefault();
        if (items[this.currentSelectedIndex]) {
          items[this.currentSelectedIndex].click();
        }
      }
    }

    updateFocusedQuery(items) {
      items.forEach((item, idx) => {
        const isSelected = idx === this.currentSelectedIndex;
        item.classList.toggle(this.classes.selected, isSelected);
        item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        if (isSelected && this.input) {
          this.input.setAttribute('aria-activedescendant', item.id);
        }
      });
    }

    clearActiveDescendant() {
      this.currentSelectedIndex = -1;
      if (this.input) {
        this.input.removeAttribute('aria-activedescendant');
      }
    }

    handleSubmit(e) {
      if (!this.input || !this.input.value.trim()) {
        e.preventDefault();
      }
    }

    handleQueryClick(e) {
      const link = e.target.closest(this.selectors.queryLink);
      if (link && this.input) {
        this.input.value = link.textContent.trim();
        this.updateValueState(true);
      }
    }

    handleSuggestedClick(e) {
      const btn = e.target.closest(this.selectors.suggestedBtn);
      if (btn) {
        const query = btn.getAttribute('data-query') || btn.textContent.trim();
        if (this.input) {
          clearTimeout(this.debounceTimer);
          this.input.value = query;
          this.input.focus();
          this.currentQuery = query;
          this.updateValueState(true);
          this.fetchSuggestions(query);
        }
      }
    }

    toggleNoResults(isVisible) {
      if (!this.noResultsEl) return;
      this.noResultsEl.style.display = isVisible ? 'block' : 'none';
      this.noResultsEl.classList.toggle(this.classes.visible, isVisible);
    }

    showInitialState() {
      this.updateValueState(false);
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'block';
      }
      this.toggleNoResults(false);
      this.clearSkeletonState();
      if (this.resultsContainer) {
        this.resultsContainer.style.display = 'none';
      }
      if (this.input) {
        this.input.setAttribute('aria-expanded', 'false');
      }
      this.showLoading(false);
    }

    async fetchSuggestions(query) {
      if (this.cache.has(query)) {
        if (this.currentQuery === query) {
          this.renderResults(query, this.cache.get(query));
        }
        return;
      }

      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      this.showSkeleton(query);
      this.showLoading(true);

      try {
        const endpoint = `/search/suggest.json?q=${encodeURIComponent(
          query
        )}&resources[type]=query,product&resources[limit]=${Math.max(this.maxQueries, this.maxProducts)}&resources[limit_scope]=each`;

        const response = await fetch(endpoint, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`Search request failed: ${response.status}`);

        const json = await response.json();

        // Manage cache size limit
        if (this.cache.size >= this.maxCacheEntries) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        this.cache.set(query, json);

        // Render if query matches active input
        if (this.currentQuery === query) {
          this.showLoading(false);
          this.renderResults(query, json);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[PredictiveSearch] Fetch error:', err);
          this.showLoading(false);
          if (this.resultsContainer?.classList.contains(this.classes.loading)) {
            this.closeResults();
          }
        }
      }
    }

    showLoading(isLoading) {
      if (this.input) {
        this.input.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      }
    }

    showSkeleton(query) {
      if (!this.resultsContainer || !this.queriesList || !this.productsContainer) return;

      if (this.viewAllLink) {
        this.viewAllLink.href = this.sanitizeUrl(`${this.searchUrl}?q=${encodeURIComponent(query)}`);
      }

      if (this.resultsContainer.classList.contains(this.classes.loading)) return;

      this.queriesList.innerHTML = Array.from({ length: this.maxQueries })
        .map(
          () => `
          <li class="pred-Search_QueryItem pred-Search_QueryItem-skeleton" aria-hidden="true">
            <span class="pred-Skeleton pred-Skeleton-text"></span>
          </li>`
        )
        .join('');

      this.productsContainer.innerHTML = Array.from({ length: this.maxProducts })
        .map(
          () => `
          <div class="${this.classes.card} pred-Card-skeleton" aria-hidden="true">
            <div class="pred-Card_ImageContainer pred-Skeleton"></div>
          </div>`
        )
        .join('');

      this.clearActiveDescendant();
      this.toggleNoResults(false);
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'none';
      }
      this.resultsContainer.classList.add(this.classes.loading);
      this.resultsContainer.setAttribute('aria-busy', 'true');
      this.openResults();
    }

    clearSkeletonState() {
      if (!this.resultsContainer) return;
      this.resultsContainer.classList.remove(this.classes.loading);
      this.resultsContainer.setAttribute('aria-busy', 'false');
    }

    renderResults(query, data) {
      const queries = data?.resources?.results?.queries || [];
      const products = data?.resources?.results?.products || [];

      this.clearSkeletonState();

      if (queries.length === 0 && products.length === 0) {
        if (this.noResultsQueryEl) {
          this.noResultsQueryEl.textContent = query;
        }
        this.toggleNoResults(true);
        if (this.suggestedEl) {
          this.suggestedEl.style.display = 'block';
        }
        if (this.resultsContainer) {
          this.resultsContainer.style.display = 'none';
        }
        if (this.input) {
          this.input.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      this.toggleNoResults(false);
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'none';
      }

      if (this.queriesList) {
        this.queriesList.innerHTML = queries
          .slice(0, this.maxQueries)
          .map(
            (item, idx) => `
            <li class="pred-Search_QueryItem js-predictive-search-query-item" role="presentation">
              <a
                id="${this.resultsContainer?.id || 'predictive-search'}-query-${idx}"
                class="pred-Search_QueryLink text-reg-12 js-predictive-search-query-link"
                href="${this.escapeHtml(this.sanitizeUrl(item.url || `${this.searchUrl}?q=${encodeURIComponent(item.text)}`))}"
                role="option"
                aria-selected="false"
              >
                ${this.escapeHtml(item.text)}
              </a>
            </li>`
          )
          .join('');
      }
      this.clearActiveDescendant();

      if (this.viewAllLink) {
        this.viewAllLink.href = this.sanitizeUrl(`${this.searchUrl}?q=${encodeURIComponent(query)}`);
      }

      if (this.productsContainer) {
        const displayProducts = products.slice(0, this.maxProducts);

        if (displayProducts.length > 0) {
          this.productsContainer.innerHTML = displayProducts
            .map((product) => {
              const imageUrl = product.featured_image?.url || product.image || '';
              const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price);
              const priceFormatted = this.formatPrice(product.price);
              const comparePriceFormatted = hasDiscount ? this.formatPrice(product.compare_at_price) : '';
              const productUrl = this.escapeHtml(this.sanitizeUrl(product.url));
              const titleEscaped = this.escapeHtml(product.title);

              return `
                <div class="${this.classes.card} util-FauxLink">
                  ${
                    imageUrl
                      ? `
                    <div class="pred-Card_ImageContainer">
                      <div class="pred-Card_ImageOuter">
                        <img
                          class="pred-Card_Image"
                          src="${this.resizeImageUrl(imageUrl, 384)}"
                          srcset="${this.imageWidths.map((w) => `${this.resizeImageUrl(imageUrl, w)} ${w}w`).join(', ')}"
                          sizes="(min-width: 1201px) 256px, (min-width: 768px) 246px, 33vw"
                          width="384"
                          height="480"
                          alt="${titleEscaped}"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    </div>`
                      : ''
                  }
                  <div class="pred-Card_Bottom">
                    <div class="pred-Card_Content text-reg-12">
                      <p class="pred-Card_Kicker ${this.classes.kickerRed} text-med-10 uppercase">
                        ${hasDiscount ? 'ON SALE' : ''}
                      </p>
                      <h3 class="pred-Card_Title text-reg-12 uppercase">
                        ${titleEscaped}
                      </h3>
                      <div class="pred-Card_Price">
                        <p class="prd-Price ${hasDiscount ? this.classes.onSale : ''}">
                          ${comparePriceFormatted ? `<s class="prd-Price_Compare text-reg-12">${comparePriceFormatted}</s>` : ''}
                          <span class="prd-Price_Price ${hasDiscount ? this.classes.kickerRed : ''} text-med-12">${priceFormatted}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <a class="pred-Card_FauxLink util-FauxLink_Link" href="${productUrl}" aria-label="${titleEscaped}"></a>
                </div>
              `;
            })
            .join('');
          this.revealImagesOnLoad(this.productsContainer);
        } else {
          this.productsContainer.innerHTML = '';
        }
      }

      this.openResults();
    }

    resizeImageUrl(url, width) {
      const safeUrl = this.sanitizeUrl(url);
      try {
        const resized = new URL(safeUrl, window.location.origin);
        resized.searchParams.set('width', width);
        return this.escapeHtml(resized.toString());
      } catch (e) {
        return this.escapeHtml(safeUrl);
      }
    }

    revealImagesOnLoad(container) {
      container.querySelectorAll('.pred-Card_Image').forEach((img) => {
        const reveal = () => img.classList.add(this.classes.visible);
        if (img.complete) {
          reveal();
        } else {
          img.addEventListener('load', reveal, { once: true });
          img.addEventListener('error', reveal, { once: true });
        }
      });
    }

    openResults() {
      if (this.resultsContainer) {
        this.resultsContainer.style.display = 'block';
      }
      if (this.input) {
        this.input.setAttribute('aria-expanded', 'true');
      }
    }

    resetSearch() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.currentQuery = '';
      if (this.input) {
        this.input.value = this.input.defaultValue;
      }
      if (this.queriesList) {
        this.queriesList.innerHTML = '';
      }
      if (this.productsContainer) {
        this.productsContainer.innerHTML = '';
      }
      this.closeResults();
    }

    closeResults() {
      this.clearSkeletonState();
      if (this.resultsContainer) {
        this.resultsContainer.style.display = 'none';
      }
      this.toggleNoResults(false);
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'block';
      }
      if (this.input) {
        this.input.setAttribute('aria-expanded', 'false');
      }
      this.clearActiveDescendant();
      this.showLoading(false);
    }
  }

  customElements.define('predictive-search', PredictiveSearch);
}

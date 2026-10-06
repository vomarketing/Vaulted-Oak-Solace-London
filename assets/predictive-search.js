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
      submit: '.js-predictive-search-submit',
      close: '.js-predictive-search-close',
      suggested: '.js-predictive-search-suggested',
      suggestedList: '.js-predictive-search-suggested-list',
      suggestedBtn: '.js-predictive-search-suggested-btn',
      noResults: '.js-predictive-search-no-results',
      noResultsQuery: '.js-predictive-search-no-results-query',
      results: '.js-predictive-search-results',
      resultsGrid: '.js-predictive-search-grid',
      queries: '.js-predictive-search-queries',
      queryItem: '.js-predictive-search-query-item',
      queryLink: '.js-predictive-search-query-link',
      products: '.js-predictive-search-products',
      viewAll: '.js-predictive-search-view-all',
      loading: '.js-predictive-search-loading'
    };

    static classes = {
      drawerActive: 'drw-Drawer-active',
      drawerHasValue: 'drw-Drawer-searchHasValue',
      card: 'pred-Card',
      onSale: 'prd-Price-onSale',
      kickerRed: 'prd-Card_Kicker-red',
      selected: 'is-selected',
      visible: 'is-visible',
      hidden: 'is-hidden'
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
      this.loadingEl = null;

      // State & Controllers
      this.abortController = null;
      this.debounceTimer = null;
      this.observer = null;
      this.cache = new Map();
      this.maxCacheEntries = 50;
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
      this.loadingEl = this.querySelector(this.selectors.loading);

      if (!this.input || !this.form) return;

      this.bindEvents();
      this.setupObserver();
    }

    disconnectedCallback() {
      this.cleanup();
      this.unbindEvents();
    }

    cleanup() {
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
        const isHorizontal = this.layout === 'horizontal';

        if (isHorizontal) {
          headerEls.forEach((el) => el.classList.toggle('hd-Header-searchActive', isActive));
          document.body.classList.toggle('has-horizontal-search-active', isActive);
        } else {
          headerEls.forEach((el) => el.classList.remove('hd-Header-searchActive'));
          document.body.classList.remove('has-horizontal-search-active');
        }
        document.body.classList.toggle('has-search-active', isActive);

        if (isActive) {
          setTimeout(() => {
            if (this.input) {
              this.input.focus();
              const val = this.input.value.trim();
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
          this.resetSearch();
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
      this.currentSelectedIndex = -1;

      const hasValue = query.length > 0;
      this.updateValueState(hasValue);

      if (!hasValue) {
        this.showInitialState();
        return;
      }

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
        if (isSelected) {
          item.focus();
        }
      });
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
          this.input.value = query;
          this.input.focus();
          this.currentQuery = query;
          this.updateValueState(true);
          this.fetchSuggestions(query);
        }
      }
    }

    showInitialState() {
      this.updateValueState(false);
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'block';
      }
      if (this.noResultsEl) {
        this.noResultsEl.style.display = 'none';
      }
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

      this.showLoading(true);

      try {
        const endpoint = `/search/suggest.json?q=${encodeURIComponent(
          query
        )}&resources[type]=query,product`;

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
        }
      }
    }

    showLoading(isLoading) {
      if (this.loadingEl) {
        this.loadingEl.style.display = isLoading ? 'flex' : 'none';
        this.loadingEl.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
      }
      if (this.input) {
        this.input.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      }
    }

    renderResults(query, data) {
      const queries = data?.resources?.results?.queries || [];
      const products = data?.resources?.results?.products || [];

      if (queries.length === 0 && products.length === 0) {
        if (this.noResultsEl) {
          if (this.noResultsQueryEl) {
            this.noResultsQueryEl.textContent = query;
          }
          this.noResultsEl.style.display = 'block';
        }
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

      if (this.noResultsEl) {
        this.noResultsEl.style.display = 'none';
      }
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'none';
      }

      if (this.queriesList) {
        let queriesHtml = '';
        if (queries.length > 0) {
          queriesHtml = queries
            .map(
              (item) => `
              <li class="pred-Search_QueryItem js-predictive-search-query-item" role="option">
                <a class="pred-Search_QueryLink text-reg-12 js-predictive-search-query-link" href="${this.sanitizeUrl(item.url || `${this.searchUrl}?q=${encodeURIComponent(item.text)}`)}">
                  ${this.escapeHtml(item.text)}
                </a>
              </li>`
            )
            .join('');
        } else if (query.length > 0) {
          queriesHtml = `
            <li class="pred-Search_QueryItem js-predictive-search-query-item" role="option">
              <a class="pred-Search_QueryLink text-reg-12 js-predictive-search-query-link" href="${this.sanitizeUrl(`${this.searchUrl}?q=${encodeURIComponent(query)}`)}">
                ${this.escapeHtml(query)}
              </a>
            </li>`;
        }
        this.queriesList.innerHTML = queriesHtml;
      }

      if (this.viewAllLink) {
        this.viewAllLink.href = this.sanitizeUrl(`${this.searchUrl}?q=${encodeURIComponent(query)}`);
      }

      if (this.productsContainer) {
        const maxProducts = 3;
        const displayProducts = products.slice(0, maxProducts);

        if (displayProducts.length > 0) {
          this.productsContainer.innerHTML = displayProducts
            .map((product) => {
              const imageUrl = product.featured_image?.url || product.image || '';
              const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price);
              const priceFormatted = this.formatPrice(product.price);
              const comparePriceFormatted = hasDiscount ? this.formatPrice(product.compare_at_price) : '';
              const productUrl = this.sanitizeUrl(product.url);
              const titleEscaped = this.escapeHtml(product.title);

              return `
                <div class="${this.classes.card} util-FauxLink">
                  ${
                    imageUrl
                      ? `
                    <div class="pred-Card_ImageContainer">
                      <div class="pred-Card_ImageOuter">
                        <img class="pred-Card_Image" src="${this.sanitizeUrl(imageUrl)}" alt="${titleEscaped}" loading="lazy" />
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
        } else {
          this.productsContainer.innerHTML = '';
        }
      }

      this.openResults();
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
        this.input.value = '';
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
      if (this.resultsContainer) {
        this.resultsContainer.style.display = 'none';
      }
      if (this.noResultsEl) {
        this.noResultsEl.style.display = 'none';
      }
      if (this.suggestedEl) {
        this.suggestedEl.style.display = 'block';
      }
      if (this.input) {
        this.input.setAttribute('aria-expanded', 'false');
      }
      this.currentSelectedIndex = -1;
      this.showLoading(false);
    }
  }

  customElements.define('predictive-search', PredictiveSearch);
}

if (!customElements.get('related-products')) {
  class RelatedProducts extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        wrapper: '.js-related-products-wrapper',
        card: '.prd-Card'
      };

      this.classes = {
        isLoading: 'is-loading',
        shopifySection: 'shopify-section'
      };

      this.wrapper = null;
      this.abortController = null;
      this.hasRequested = false;
    }

    connectedCallback() {
      this.wrapper = this.querySelector(this.selectors.wrapper);

      if (this.hasCards(this.wrapper)) {
        this.reveal();
        return;
      }

      if (this.hasRequested) return;

      this.hasRequested = true;
      this.loadRecommendations();
    }

    disconnectedCallback() {
      requestAnimationFrame(() => {
        if (!this.isConnected && this.abortController) {
          this.abortController.abort();
        }
      });
    }

    hasCards(container) {
      return !!container && !!container.querySelector(this.selectors.card);
    }

    get endpoint() {
      const base = this.dataset.recommendationsUrl || '/recommendations/products';
      const params = new URLSearchParams({
        section_id: this.dataset.sectionId || '',
        product_id: this.dataset.productId || '',
        limit: this.dataset.limit || '4',
        intent: 'related'
      });

      return `${base}?${params.toString()}`;
    }

    async loadRecommendations() {
      if (!this.wrapper || !this.dataset.productId) {
        this.hideSection();
        return;
      }

      this.abortController = new AbortController();

      try {
        const response = await fetch(this.endpoint, { signal: this.abortController.signal });

        if (!response.ok) {
          throw new Error(`Product recommendations request failed: ${response.status}`);
        }

        const markup = await response.text();
        const fetched = new DOMParser().parseFromString(markup, 'text/html').querySelector(this.selectors.wrapper);

        if (!this.hasCards(fetched)) {
          this.hideSection();
          return;
        }

        this.wrapper.innerHTML = fetched.innerHTML;
        this.reveal();
      } catch (error) {
        if (error.name === 'AbortError') return;

        console.log('errors: ', error);
        this.hideSection();
      }
    }

    reveal() {
      this.classList.remove(this.classes.isLoading);
    }

    hideSection() {
      this.reveal();
      this.style.display = 'none';

      const section = this.closest(`.${this.classes.shopifySection}`);
      if (section) {
        section.style.display = 'none';
      }

      const controller = window.fullpageScrollInstance;
      if (controller && controller.swiper) {
        controller.swiper.update();
      }
    }
  }

  customElements.define('related-products', RelatedProducts);
}

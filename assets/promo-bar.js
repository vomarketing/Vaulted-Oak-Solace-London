/**
 * PromoBarController
 * Stacks promo bars that share a position and publishes their combined
 * height on <html> so the header and page content can make room:
 *   --promo-bar-top-height, --promo-bar-bottom-height
 * Top bars stack downwards in DOM order; bottom bars stack upwards.
 */
if (!window.PromoBarController) {
  class PromoBarController {
    static selectors = {
      bar: '[data-promo-bar]'
    };

    constructor() {
      this.selectors = PromoBarController.selectors;
      this.resizeObserver = new ResizeObserver(() => this.layout());

      this.observe();
      this.bindEvents();
    }

    observe() {
      this.resizeObserver.disconnect();
      this.bars = Array.from(document.querySelectorAll(this.selectors.bar));
      this.bars.forEach((bar) => this.resizeObserver.observe(bar));
      this.layout();
    }

    layout() {
      const totals = { top: 0, bottom: 0 };

      this.bars.forEach((bar) => {
        const position = bar.dataset.promoBarPosition === 'top' ? 'top' : 'bottom';
        bar.style.setProperty('--promo-bar-offset', `${totals[position]}px`);
        totals[position] += bar.offsetHeight;
      });

      const root = document.documentElement.style;
      root.setProperty('--promo-bar-top-height', `${totals.top}px`);
      root.setProperty('--promo-bar-bottom-height', `${totals.bottom}px`);

      // --header-height includes top bars (see custom-header.js), so re-measure.
      window.headerContrastController?.cacheHeaderHeight();
    }

    bindEvents() {
      document.addEventListener('shopify:section:load', () => this.observe());
      document.addEventListener('shopify:section:unload', () => {
        // The unloading section is still in the DOM when this fires.
        requestAnimationFrame(() => this.observe());
      });
    }
  }

  window.PromoBarController = PromoBarController;

  const initPromoBar = () => {
    if (!window.promoBarController) {
      window.promoBarController = new PromoBarController();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromoBar);
  } else {
    initPromoBar();
  }
}

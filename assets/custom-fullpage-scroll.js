if (!window.FullpageScroll) {
  if (!window.ScrollEngine) {
    console.warn('ScrollEngine base class not loaded. Load scroll-engine.js first.');
  } else {
    class FullpageScrollController extends window.ScrollEngine {
      static selectors = {
        sections: '#MainContent > .shopify-section',
        pdpMain: '.pdp-new__main',
        pdpEditorial: '.pdp-editorial, .js-pdp-editorial',
        pdpEditorialSections: 'section.js-section-header-contrast, section',
        pdpBackLink: '.pg-Back'
      };

      constructor(config = {}) {
        super(config);
      }

      canActivate() {
        return document.body.hasAttribute('data-fullpage-scroll');
      }

      getStops() {
        const sel = FullpageScrollController.selectors;
        const pdpMain = document.querySelector(sel.pdpMain);

        let elements = [];

        if (pdpMain) {
          const editorial = document.querySelector(sel.pdpEditorial);
          if (editorial) {
            elements = Array.from(editorial.querySelectorAll(sel.pdpEditorialSections));
          }

          const backLink = Array.from(document.querySelectorAll(sel.pdpBackLink));
          elements = [...elements, ...backLink];

          const pdpSection = pdpMain.closest('.shopify-section');
          const otherSections = Array.from(document.querySelectorAll(sel.sections)).filter(
            (sec) => sec !== pdpSection
          );
          elements = [...elements, ...otherSections];
        } else {
          elements = Array.from(document.querySelectorAll(sel.sections));
        }

        return elements.filter((el) => {
          return el.offsetHeight > 50 && window.getComputedStyle(el).display !== 'none';
        });
      }

      shouldBlockScroll(event) {
        const pdpMain = document.querySelector(FullpageScrollController.selectors.pdpMain);
        if (pdpMain) {
          const mainBottom = pdpMain.getBoundingClientRect().bottom;
          if (mainBottom > 0) {
            return true;
          }
        }
        return false;
      }

      _onInit() {
        const stops = this.getStops();
        if (stops.length <= 1) return;
        this._bindEvents();
        this._bindShopifyEditorEvents();
      }

      _bindShopifyEditorEvents() {
        const signal = this.abortSignal;
        if (!signal) return;

        const refresh = () => {
          if (this.getStops().length <= 1) {
            this.destroy();
          }
        };

        document.addEventListener('shopify:section:load', refresh, { signal });
        document.addEventListener('shopify:section:reorder', refresh, { signal });
        document.addEventListener('shopify:section:select', refresh, { signal });
      }
    }

    window.FullpageScroll = FullpageScrollController;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new FullpageScrollController());
    } else {
      new FullpageScrollController();
    }
  }
}

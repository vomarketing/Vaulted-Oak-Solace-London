/**
 * PromoBarController
 * - Stacks promo bars that share a position and publishes their combined
 *   height on <html> so the header and page content can make room:
 *     --promo-bar-top-height, --promo-bar-bottom-height
 *   Top bars stack downwards in DOM order; bottom bars stack upwards.
 * - Toggles each bar's attached popup panel (+/- icon via aria-expanded).
 * - Points "Open newsletter popup" buttons at the footer newsletter popup,
 *   which custom-footer.js opens for any [data-newsletter-popup-open].
 */
if (!window.PromoBarController) {
  class PromoBarController {
    static selectors = {
      bar: '[data-promo-bar]',
      toggle: '[data-promo-bar-toggle]',
      panel: '[data-promo-bar-panel]',
      close: '[data-promo-bar-close]',
      newsletterButton: '[data-promo-bar-newsletter]',
      newsletterPopup: '[data-newsletter-popup]'
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
      this.connectNewsletterButtons();
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

    // Revealed only when the footer newsletter popup exists on the page.
    connectNewsletterButtons() {
      const popup = document.querySelector(this.selectors.newsletterPopup);

      document.querySelectorAll(this.selectors.newsletterButton).forEach((button) => {
        if (!popup?.id) {
          button.hidden = true;
          return;
        }

        button.setAttribute('data-newsletter-popup-open', '');
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', popup.id);
        button.hidden = false;
      });
    }

    getParts(bar) {
      return {
        toggle: bar?.querySelector(this.selectors.toggle),
        panel: bar?.querySelector(this.selectors.panel)
      };
    }

    open(bar) {
      const { toggle, panel } = this.getParts(bar);
      if (!toggle || !panel) return;

      // One panel at a time.
      this.bars.forEach((other) => {
        if (other !== bar) this.close(other);
      });

      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    }

    close(bar, { restoreFocus = false } = {}) {
      const { toggle, panel } = this.getParts(bar);
      if (!toggle || !panel || panel.hidden) return;

      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');

      if (restoreFocus) toggle.focus();
    }

    bindEvents() {
      document.addEventListener('click', (e) => {
        const toggle = e.target.closest(this.selectors.toggle);
        if (toggle) {
          const bar = toggle.closest(this.selectors.bar);
          if (toggle.getAttribute('aria-expanded') === 'true') {
            this.close(bar);
          } else {
            this.open(bar);
          }
          return;
        }

        const closeButton = e.target.closest(this.selectors.close);
        if (closeButton) {
          this.close(closeButton.closest(this.selectors.bar), { restoreFocus: true });
        }
      });

      // Capture phase, so this runs before custom-footer.js closes its popup
      // on the same keypress: Escape closes the newsletter popup first.
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (document.body.classList.contains('is-newsletter-popup-open')) return;

        this.bars.forEach((bar) => {
          this.close(bar, { restoreFocus: bar.contains(document.activeElement) });
        });
      }, true);

      document.addEventListener('shopify:section:load', () => this.observe());
      document.addEventListener('shopify:section:unload', () => {
        // The unloading section is still in the DOM when this fires.
        requestAnimationFrame(() => this.observe());
      });

      // Theme editor: show the panel while its section is selected.
      document.addEventListener('shopify:section:select', (e) => {
        this.open(e.target.querySelector(this.selectors.bar));
      });
      document.addEventListener('shopify:section:deselect', (e) => {
        this.close(e.target.querySelector(this.selectors.bar));
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

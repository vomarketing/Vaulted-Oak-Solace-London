/**
 * FooterRevealController
 */
if (!window.FooterRevealController) {
  class FooterRevealController {
    static selectors = {
      footer: '.js-section-footer',
      mainContent: '#MainContent'
    };

    static classes = {
      isVisible: 'is-visible'
    };

    constructor() {
      this.selectors = FooterRevealController.selectors;
      this.classes = FooterRevealController.classes;
      this.footer = null;
      this.mainContent = null;
      this.abortController = new AbortController();

      this.init();
    }

    init() {
      this.footer = document.querySelector(this.selectors.footer);
      this.mainContent = document.querySelector(this.selectors.mainContent);

      if (!this.footer) return;

      this.bindEvents();
      this.checkVisibility();
    }

    checkVisibility() {
      if (!this.footer) return;

      if (document.body.hasAttribute('data-fullpage-scroll')) return;

      if (this.mainContent) {
        const rect = this.mainContent.getBoundingClientRect();
        const isAtBottom = rect.bottom <= window.innerHeight + 60;
        this.footer.classList.toggle(this.classes.isVisible, isAtBottom);
      } else {
        const scrollBottom = window.scrollY + window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;
        const isAtBottom = scrollBottom >= pageHeight - 60;
        this.footer.classList.toggle(this.classes.isVisible, isAtBottom);
      }
    }

    bindEvents() {
      const { signal } = this.abortController;

      window.addEventListener('scroll', () => this.checkVisibility(), { passive: true, signal });
      window.addEventListener('resize', () => this.checkVisibility(), { passive: true, signal });
      window.addEventListener('load', () => this.checkVisibility(), { passive: true, signal });

      // Shopify Theme Editor Events
      const handleShopifySectionUpdate = () => {
        setTimeout(() => {
          this.footer = document.querySelector(this.selectors.footer);
          this.mainContent = document.querySelector(this.selectors.mainContent);
          this.checkVisibility();
        }, 100);
      };

      document.addEventListener('shopify:section:load', handleShopifySectionUpdate, { signal });
      document.addEventListener('shopify:section:reorder', handleShopifySectionUpdate, { signal });
      document.addEventListener('shopify:section:select', handleShopifySectionUpdate, { signal });
    }

    destroy() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = new AbortController();
      }
    }
  }

  window.FooterRevealController = FooterRevealController;

  const initFooterReveal = () => {
    if (!window.footerRevealInstance) {
      window.footerRevealInstance = new FooterRevealController();
    } else {
      window.footerRevealInstance.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooterReveal);
  } else {
    initFooterReveal();
  }
}

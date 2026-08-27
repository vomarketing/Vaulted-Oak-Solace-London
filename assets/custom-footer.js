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

      if (document.body.hasAttribute('data-fullpage-scroll')) {
        this._syncFromSwiper();
      }
    }

    _syncFromSwiper() {
      if (window.fullpageScrollInstance?.swiper) {
        const sw = window.fullpageScrollInstance.swiper;
        const total = sw.slides ? sw.slides.length : 0;
        const isLastSlide = total > 0 && sw.activeIndex === total - 1;
        this.setVisible(isLastSlide);
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;
      const timer = setInterval(() => {
        attempts++;
        if (window.fullpageScrollInstance?.swiper) {
          clearInterval(timer);
          const sw = window.fullpageScrollInstance.swiper;
          const total = sw.slides ? sw.slides.length : 0;
          const isLastSlide = total > 0 && sw.activeIndex === total - 1;
          this.setVisible(isLastSlide);
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
        }
      }, 100);
    }

    setVisible(isVisible) {
      if (!this.footer) return;
      this.footer.classList.toggle(this.classes.isVisible, isVisible);
    }

    checkVisibility() {
      if (!this.footer) return;

      // On fullpage swiper pages, visibility is driven by fullpage:slideChange events
      if (document.body.hasAttribute('data-fullpage-scroll')) return;

      if (this.mainContent) {
        const rect = this.mainContent.getBoundingClientRect();
        const isAtBottom = rect.bottom <= window.innerHeight + 60;
        this.setVisible(isAtBottom);
      } else {
        const scrollBottom = window.scrollY + window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;
        const isAtBottom = scrollBottom >= pageHeight - 60;
        this.setVisible(isAtBottom);
      }
    }

    bindEvents() {
      const { signal } = this.abortController;

      window.addEventListener('scroll', () => this.checkVisibility(), { passive: true, signal });
      window.addEventListener('resize', () => this.checkVisibility(), { passive: true, signal });
      window.addEventListener('load', () => this.checkVisibility(), { passive: true, signal });

      document.addEventListener('fullpage:slideChange', (e) => {
        if (e.detail && typeof e.detail.isLastSlide === 'boolean') {
          this.setVisible(e.detail.isLastSlide);
        }
      }, { signal });

      document.addEventListener('fullpage:ready', (e) => {
        if (!e.detail?.swiper) return;
        const sw = e.detail.swiper;
        const total = sw.slides ? sw.slides.length : 0;
        const isLastSlide = total > 0 && sw.activeIndex === total - 1;
        this.setVisible(isLastSlide);
      }, { signal });

      this.bindFooterInteraction(signal);

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

    bindFooterInteraction(signal) {
      if (!this.footer) return;

      let touchStartY = 0;
      let isTouchDown = false;

      this.footer.addEventListener('wheel', (e) => {
        if (!this.footer.classList.contains(this.classes.isVisible)) return;
        if (e.deltaY < -15) {
          if (e.cancelable) e.preventDefault();
          document.dispatchEvent(new CustomEvent('fullpage:prevSlide'));
        }
      }, { passive: false, signal });

      this.footer.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          touchStartY = e.touches[0].clientY;
          isTouchDown = true;
        }
      }, { passive: true, signal });

      this.footer.addEventListener('touchmove', (e) => {
        if (!isTouchDown || !e.touches || !e.touches.length) return;
        if (!this.footer.classList.contains(this.classes.isVisible)) return;

        const currentY = e.touches[0].clientY;
        const diffY = touchStartY - currentY;

        if (diffY < -30) {
          isTouchDown = false;
          document.dispatchEvent(new CustomEvent('fullpage:prevSlide'));
        }
      }, { passive: true, signal });

      this.footer.addEventListener('touchend', () => {
        isTouchDown = false;
      }, { passive: true, signal });
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

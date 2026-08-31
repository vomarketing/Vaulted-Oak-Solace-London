if (!window.SolaceHeaderContrast) {
  class HeaderContrastController {
    static selectors = {
      headerWrapper: '.js-header-wrapper',
      header: '.js-header',
      sections: '.js-section-header-contrast'
    };

    static classes = {
      isScrolled: 'is-scrolled'
    };

    constructor() {
      this.selectors = HeaderContrastController.selectors;
      this.classes = HeaderContrastController.classes;

      this.headerWrapper = document.querySelector(this.selectors.headerWrapper);
      this.header = document.querySelector(this.selectors.header);
      if (!this.header) return;

      this.observer = null;
      this.isTicking = false;
      this.currentMode = null;
      this.sections = [];
      this.headerHeight = 80;

      this.init();
    }

    init() {
      this.cacheHeaderHeight();
      this.setupStickyState();
      this.setupObserver();
      this.detectSectionMode();
      this.bindEvents();
    }

    cacheHeaderHeight() {
      if (this.headerWrapper && this.headerWrapper.offsetHeight > 0) {
        this.headerHeight = this.headerWrapper.offsetHeight;
      } else {
        this.headerHeight = this.header ? this.header.offsetHeight || 80 : 80;
      }
    }

    getModeFromElement(el) {
      if (!el) return 'dark';
      return (
        el.getAttribute('data-header-mode') ||
        el.querySelector('[data-header-mode]')?.getAttribute('data-header-mode') ||
        'dark'
      );
    }

    setupStickyState() {
      const isSticky = this.header.getAttribute('data-sticky') === 'true';
      if (!isSticky) return;

      const handleScroll = () => {
        const scrolled = window.scrollY > 10;
        this.header.classList.toggle(this.classes.isScrolled, scrolled);
        if (this.headerWrapper) {
          this.headerWrapper.classList.toggle(this.classes.isScrolled, scrolled);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }

    setupObserver() {
      if (this.observer) {
        this.observer.disconnect();
      }

      this.sections = Array.from(document.querySelectorAll(this.selectors.sections));
      if (!this.sections.length) {
        this.setMode('dark');
        return;
      }

      const rootMarginTop = 0;
      const rootMarginBottom = -(window.innerHeight - Math.max(this.headerHeight, 20));

      this.observer = new IntersectionObserver(
        (entries) => {
          if (window._swiperIsTransitioning) return;

          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (window._swiperIsTransitioning) return;
              const mode = this.getModeFromElement(entry.target);
              const isSplit = !!entry.target.closest('.pdp-new__main, .pdp-new__gallery-column');
              this.updateContrast(mode, isSplit);
            }
          });
        },
        {
          root: null,
          rootMargin: `${rootMarginTop}px 0px ${rootMarginBottom}px 0px`,
          threshold: 0.05
        }
      );

      this.sections.forEach((section) => this.observer.observe(section));
    }

    detectSectionMode() {
      if (window._swiperIsTransitioning) return;

      const triggerY = this.headerHeight / 2;
      const allSections = this.sections;

      if (!allSections || !allSections.length) {
        this.updateContrast('dark', false);
        return;
      }

      let activeMode = null;
      let activeSection = null;

      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        const rect = section.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom > triggerY) {
          activeMode = this.getModeFromElement(section);
          activeSection = section;
          break;
        }
      }

      if (!activeMode && window.scrollY === 0 && allSections.length > 0) {
        activeMode = this.getModeFromElement(allSections[0]);
        activeSection = allSections[0];
      }

      const isSplit = activeSection ? !!activeSection.closest('.pdp-new__main, .pdp-new__gallery-column') : false;
      this.updateContrast(activeMode || 'dark', isSplit);
    }

    setSplit(isSplit) {
      const splitValue = isSplit ? 'true' : 'false';
      if (this.header.getAttribute('data-header-split') === splitValue) return;

      this.header.setAttribute('data-header-split', splitValue);
      if (this.headerWrapper) {
        this.headerWrapper.setAttribute('data-header-split', splitValue);
      }
    }

    setMode(mode) {
      if (this.currentMode === mode && this.header.getAttribute('data-header-mode') === mode) return;

      this.currentMode = mode;
      this.header.setAttribute('data-header-mode', mode);

      if (this.headerWrapper) {
        this.headerWrapper.setAttribute('data-header-mode', mode);
      }
    }

    updateContrast(mode, isSplit = false) {
      this.setSplit(isSplit);
      this.setMode(mode);
    }

    bindEvents() {
      window.addEventListener('scroll', () => {
        if (window._swiperIsTransitioning) return;
        if (!this.isTicking) {
          this.isTicking = true;
          window.requestAnimationFrame(() => {
            if (!window._swiperIsTransitioning) {
              this.detectSectionMode();
            }
            this.isTicking = false;
          });
        }
      }, { passive: true });

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.cacheHeaderHeight();
          this.setupObserver();
          this.detectSectionMode();
        }, 150);
      });

      document.addEventListener('header:set-mode', (event) => {
        if (event.detail && event.detail.mode) {
          this.setMode(event.detail.mode);
        }
      });

      document.addEventListener('shopify:section:load', () => this.refresh());
      document.addEventListener('shopify:section:reorder', () => this.refresh());
      document.addEventListener('shopify:section:select', () => this.refresh());
    }

    refresh() {
      this.cacheHeaderHeight();
      this.setupObserver();
      this.detectSectionMode();
    }
  }

  window.SolaceHeaderContrast = HeaderContrastController;

  const initHeaderController = () => {
    if (!window.headerContrastController) {
      window.headerContrastController = new HeaderContrastController();
    }
  };

  if (document.body.hasAttribute('data-fullpage-scroll')) {
    document.addEventListener('fullpage:ready', initHeaderController);

    if (window.fullpageScrollInstance && window.fullpageScrollInstance.swiper) {
      initHeaderController();
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initHeaderController, 60);
      });
    } else {
      setTimeout(initHeaderController, 60);
    }
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHeaderController);
    } else {
      initHeaderController();
    }
  }
}

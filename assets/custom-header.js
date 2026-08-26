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

      this.init();
    }

    init() {
      this.setupStickyState();
      this.setupObserver();
      this.detectSectionMode();
      this.bindEvents();
    }

    getHeaderHeight() {
      if (this.headerWrapper && this.headerWrapper.offsetHeight > 0) {
        return this.headerWrapper.offsetHeight;
      }
      return this.header ? this.header.offsetHeight || 80 : 80;
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

      const allSections = document.querySelectorAll(this.selectors.sections);
      if (!allSections.length) {
        this.setMode('dark');
        return;
      }

      const headerHeight = this.getHeaderHeight();
      const rootMarginTop = 0;
      const rootMarginBottom = -(window.innerHeight - Math.max(headerHeight, 20));

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target;
              if (window.scrollY > 100 && target.closest('.pdp-new__gallery-column')) {
                return;
              }
              const mode = target.getAttribute('data-header-mode') || target.querySelector('[data-header-mode]')?.getAttribute('data-header-mode') || 'dark';
              const isSplit = !!target.closest('.pdp-new__main, .pdp-new__gallery-column');
              this.updateContrast(mode, isSplit);
            }
          });
        },
        {
          root: null,
          rootMargin: `${rootMarginTop}px 0px ${rootMarginBottom}px 0px`,
          threshold: 0
        }
      );

      allSections.forEach((section) => this.observer.observe(section));
    }

    detectSectionMode() {
      const headerHeight = this.getHeaderHeight();
      const triggerY = headerHeight / 2;

      // 1. If on product page with editorial swiper active
      const editorialContainer = document.querySelector('.pdp-editorial-swiper');
      if (editorialContainer && window.scrollY >= editorialContainer.offsetTop - 60) {
        const fullpageInstance = window.fullpageScrollInstance;
        if (fullpageInstance && fullpageInstance.swiper && fullpageInstance.swiper.slides) {
          const activeSlide = fullpageInstance.swiper.slides[fullpageInstance.swiper.activeIndex || 0];
          if (activeSlide) {
            const mode = activeSlide.getAttribute('data-header-mode') || activeSlide.querySelector('[data-header-mode]')?.getAttribute('data-header-mode') || 'dark';
            this.updateContrast(mode, false);
            return;
          }
        }
      }

      // 1b. If in PDP section on mobile: determine strictly by active gallery image alt logic
      const pdpNew = document.querySelector('.pdp-new');
      if (window.innerWidth <= 900 && pdpNew) {
        const activeGalleryItem = pdpNew.querySelector('.pdp-media-item.swiper-slide-active') || pdpNew.querySelector('.pdp-media-item');
        if (activeGalleryItem) {
          const mode = activeGalleryItem.getAttribute('data-header-mode') || 'light';
          this.updateContrast(mode, false);
          return;
        }
      }

      // 2. Scan visible sections
      const allSections = document.querySelectorAll(this.selectors.sections);

      if (!allSections.length) {
        this.updateContrast('dark', false);
        return;
      }

      let activeMode = null;
      let activeSection = null;

      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        if (window.scrollY > 100 && section.closest('.pdp-new__gallery-column')) {
          continue;
        }

        const rect = section.getBoundingClientRect();
        if (rect.top <= triggerY && rect.bottom > triggerY) {
          activeMode = section.getAttribute('data-header-mode') || section.querySelector('[data-header-mode]')?.getAttribute('data-header-mode') || 'dark';
          activeSection = section;
          break;
        }
      }

      if (!activeMode && window.scrollY === 0 && allSections.length > 0) {
        activeMode = allSections[0].getAttribute('data-header-mode') || allSections[0].querySelector('[data-header-mode]')?.getAttribute('data-header-mode') || 'dark';
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
        if (!this.isTicking) {
          this.isTicking = true;
          window.requestAnimationFrame(() => {
            this.detectSectionMode();
            this.isTicking = false;
          });
        }
      }, { passive: true });

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
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

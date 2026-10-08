(() => {
  if (window.SolaceCollectionScroll) return;

  class CollectionScrollController {
    static selectors = {
      header: '.js-header[data-sticky="true"]',
      collectionHeader: '[data-collection-sticky-header]'
    };

    static classes = {
      enabled: 'has-collection-scroll-animation',
      headerHidden: 'is-collection-nav-hidden'
    };

    constructor() {
      this.header = null;
      this.collectionHeader = null;
      this.headerHeight = 0;
      this.lastScrollY = Math.max(window.scrollY, 0);
      this.accumulatedDelta = 0;
      this.isTicking = false;
      this.resizeObserver = null;

      this.handleScroll = this.handleScroll.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.update = this.update.bind(this);
      this.refresh = this.refresh.bind(this);
      this.initializeDescriptionToggles();

      this.refresh();
      this.bindEvents();
    }

    refresh() {
      this.initializeDescriptionToggles();
      this.header = document.querySelector(CollectionScrollController.selectors.header);
      this.collectionHeader = document.querySelector(CollectionScrollController.selectors.collectionHeader);

      if (!this.canStick()) {
        this.destroyResizeObserver();
        document.body.classList.remove(CollectionScrollController.classes.enabled);
        this.showHeader();
        return;
      }

      document.body.classList.add(CollectionScrollController.classes.enabled);
      this.observeHeaderSize();
      this.measureHeader();
      this.lastScrollY = Math.max(window.scrollY, 0);
      this.accumulatedDelta = 0;
      this.update(true);
    }

    canStick() {
      return Boolean(
        this.header
        && this.collectionHeader
        && window.matchMedia('(min-width: 1025px)').matches
        && !this.collectionHeader.classList.contains('collection-header--with-description')
      );
    }

    bindEvents() {
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('resize', this.handleResize, { passive: true });
      window.addEventListener('pageshow', this.refresh);
      document.addEventListener('shopify:section:load', this.refresh);
      document.addEventListener('shopify:section:unload', this.refresh);
    }

    initializeDescriptionToggles() {
      document.querySelectorAll('[data-collection-description]').forEach((description) => {
        if (description.dataset.descriptionInitialized === 'true') return;
        description.dataset.descriptionInitialized = 'true';

        const toggle = description.querySelector('[data-collection-description-toggle]');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
          const scrollY = window.scrollY;
          const isExpanded = description.classList.toggle('is-expanded');
          toggle.setAttribute('aria-expanded', String(isExpanded));
          toggle.textContent = isExpanded ? toggle.dataset.readLess : toggle.dataset.readMore;

          window.requestAnimationFrame(() => {
            if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
          });
        });
      });
    }

    observeHeaderSize() {
      this.destroyResizeObserver();

      if (!('ResizeObserver' in window)) return;

      this.resizeObserver = new ResizeObserver(() => this.measureHeader());
      this.resizeObserver.observe(this.header);
    }

    destroyResizeObserver() {
      if (!this.resizeObserver) return;

      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    measureHeader() {
      if (!this.header || !this.collectionHeader) return;

      const height = Math.ceil(this.header.getBoundingClientRect().height);
      if (!height || height === this.headerHeight) return;

      this.headerHeight = height;
      document.body.style.setProperty('--header-height', `${height}px`);
    }

    handleResize() {
      const canStick = this.canStick();
      if (canStick !== document.body.classList.contains(CollectionScrollController.classes.enabled)) {
        this.refresh();
        return;
      }

      if (!canStick) return;

      this.measureHeader();
      this.lastScrollY = Math.max(window.scrollY, 0);
      this.accumulatedDelta = 0;

      if (this.lastScrollY <= 10) {
        this.showHeader();
      }
    }

    handleScroll() {
      if (this.isTicking) return;

      this.isTicking = true;
      window.requestAnimationFrame(() => {
        this.update();
        this.isTicking = false;
      });
    }

    update(force = false) {
      if (!this.canStick()) return;

      const scrollY = Math.max(window.scrollY, 0);
      const delta = scrollY - this.lastScrollY;
      const isHeaderActive = this.header.classList.contains('hd-Header-dropdownActive')
        || this.header.classList.contains('hd-Header-searchActive');

      if (force || scrollY <= 10 || isHeaderActive) {
        this.showHeader();
        this.accumulatedDelta = 0;
        this.lastScrollY = scrollY;
        return;
      }

      if (delta === 0) return;

      if (Math.sign(delta) !== Math.sign(this.accumulatedDelta)) {
        this.accumulatedDelta = delta;
      } else {
        this.accumulatedDelta += delta;
      }

      const directionThreshold = 8;
      const hideAfter = Math.max(this.headerHeight, 40);

      if (this.accumulatedDelta >= directionThreshold && scrollY > hideAfter) {
        this.hideHeader();
        this.accumulatedDelta = 0;
      } else if (this.accumulatedDelta <= -directionThreshold) {
        this.showHeader();
        this.accumulatedDelta = 0;
      }

      this.lastScrollY = scrollY;
    }

    hideHeader() {
      document.body.classList.add(CollectionScrollController.classes.headerHidden);
    }

    showHeader() {
      document.body.classList.remove(CollectionScrollController.classes.headerHidden);
    }
  }

  window.SolaceCollectionScroll = CollectionScrollController;

  const init = () => {
    if (!document.body.classList.contains('template-collection')) return;
    if (!window.solaceCollectionScrollController) {
      window.solaceCollectionScrollController = new CollectionScrollController();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/**
 * Hybrid Fullpage Scroll Controller using Swiper
 */

if (!window.FullpageScrollController) {
  class FullpageScrollController {
    static config = {
      footerBreakpoint: 768,
      mobileBreakpoint: 900,
      animationDuration: 650,
      desktopWheelThreshold: 45,
      mobileSwipeThreshold: 40
    };

    static selectors = {
      mainContent: '#MainContent',
      childSections: ':scope > .shopify-section, :scope > div:not(.swiper-wrapper)',
      headerContrastElements: '[data-header-mode]',
      header: '.js-header',
      pdpMain: '.pdp-new__main',
      pdpNew: '.js-pdp-new',
      pdpGallery: '.js-pdp-gallery-column',
      pdpContent: '.js-pdp-content-column',
      footerSection: '.shopify-section--footer, .js-section-footer',
      videos: 'video',
      ignoreScrollElements: '.drawer, .js-pdp-zoom-modal, .drw-Drawers, .js-cart-drawer'
    };

    static classes = {
      swiper: 'swiper',
      fullpageSwiper: 'fullpage-swiper',
      editorialSwiper: 'pdp-editorial-swiper',
      swiperWrapper: 'swiper-wrapper',
      fullpageWrapper: 'fullpage-wrapper',
      swiperSlide: 'swiper-slide',
      fullpageSlide: 'fullpage-slide',
      shopifySection: 'shopify-section',
      editorialActive: 'is-editorial-active',
      pdpTransitioning: 'is-pdp-transitioning',
      pdpPinned: 'is-pdp-pinned'
    };

    static events = {
      toEditorial: 'pdp:transition:to-editorial',
      fromEditorial: 'pdp:transition:from-editorial',
      sheetBottomOverscroll: 'pdp:sheet:bottom-overscroll',
      slideChange: 'fullpage:slideChange',
      ready: 'fullpage:ready'
    };

    static states = {
      PDP_IDLE: 'pdp:idle',
      TO_EDITORIAL: 'transition:to-editorial',
      EDITORIAL_IDLE: 'editorial:idle',
      TO_PDP: 'transition:to-pdp'
    };

    static awaitSwiper() {
      return new Promise((resolve) => {
        if (window.Swiper) {
          resolve();
          return;
        }
        let retries = 0;
        const maxRetries = 100;
        const check = setInterval(() => {
          if (window.Swiper) {
            clearInterval(check);
            resolve();
          } else if (retries >= maxRetries) {
            clearInterval(check);
            console.warn('Swiper load timeout');
            resolve();
          }
          retries++;
        }, 50);
      });
    }

    constructor() {
      this.config = FullpageScrollController.config;
      this.selectors = FullpageScrollController.selectors;
      this.classes = FullpageScrollController.classes;
      this.events = FullpageScrollController.events;
      this.swiper = null;
      this.container = document.querySelector(this.selectors.mainContent);
      this.wrapper = null;
      this.slides = [];
      this.pdpSection = null;
      this.editorialContainer = null;
      this.isProductPage = false;
      this.abortController = new AbortController();
      this.footerBreakpoint = this.config.footerBreakpoint;
      this.state = FullpageScrollController.states.PDP_IDLE;
      this.wheelDeltaAccumulator = 0;
      this.wheelTimeout = null;

      if (this.canActivate()) {
        this.init();
      }
    }

    canActivate() {
      return document.body.hasAttribute('data-fullpage-scroll') && !!this.container;
    }

    init() {
      FullpageScrollController.awaitSwiper().then(() => {
        if (window.Swiper) {
          this.setup();
        }
      });
    }

    setup() {
      this.destroy();
      this.isProductPage = document.body.classList.contains('template-product') || !!document.querySelector(this.selectors.pdpMain);

      if (this.isProductPage) {
        this.setupProductHybrid();
      } else {
        this.setupIndexFullpage();
      }

      this.bindNavigationEvents();
      this.bindThemeEditorEvents();
    }

    bindNavigationEvents() {
      const { signal } = this.abortController;
      document.addEventListener('fullpage:prevSlide', () => {
        if (this.swiper) {
          this.swiper.slidePrev();
        }
      }, { signal });

      const mediaQuery = window.matchMedia(`(min-width: ${this.footerBreakpoint}px)`);
      const handleBreakpoint = () => {
        this.setup();
      };
      mediaQuery.addEventListener('change', handleBreakpoint, { signal });
    }

    setupIndexFullpage() {
      if (!this.container) return;

      let swiperContainer = this.container.querySelector(`:scope > .${this.classes.fullpageSwiper}`);
      if (!swiperContainer) {
        swiperContainer = document.createElement('div');
        swiperContainer.className = `${this.classes.swiper} ${this.classes.fullpageSwiper}`;

        const wrapper = document.createElement('div');
        wrapper.className = `${this.classes.swiperWrapper} ${this.classes.fullpageWrapper}`;

        const isFooterExcluded = window.innerWidth >= this.footerBreakpoint;

        const childSections = Array.from(this.container.querySelectorAll(this.selectors.childSections)).filter(
          (el) =>
            !el.classList.contains('js-section-footer') &&
            !(isFooterExcluded && el.classList.contains('shopify-section--footer'))
        );

        childSections.forEach((section) => {
          section.classList.add(this.classes.swiperSlide, this.classes.fullpageSlide);
          wrapper.appendChild(section);
        });

        swiperContainer.appendChild(wrapper);
        this.container.appendChild(swiperContainer);
      }
      this.wrapper = swiperContainer.querySelector(`.${this.classes.swiperWrapper}`);
      this.slides = Array.from(this.wrapper.children);

      if (this.slides.length <= 1) {
        this.dispatchReadyEvent(null);
        return;
      }

      this.initSwiperInstance(swiperContainer);
    }

    setupProductHybrid() {
      const pdpMain = document.querySelector(this.selectors.pdpMain) || document.querySelector(this.selectors.pdpNew);
      if (!pdpMain) {
        this.setupIndexFullpage();
        return;
      }

      this.pdpSection = pdpMain.closest(`.${this.classes.shopifySection}`) || pdpMain.parentElement;

      const allSections = Array.from(this.container.querySelectorAll(`:scope > .${this.classes.shopifySection}`));
      const pdpIndex = allSections.indexOf(this.pdpSection);
      const editorialSections = pdpIndex !== -1 ? allSections.slice(pdpIndex + 1) : [];

      const isFooterExcluded = window.innerWidth >= this.footerBreakpoint;

      const targetSlides = editorialSections.filter(
        (el) =>
          !el.classList.contains('js-section-footer') &&
          !(isFooterExcluded && el.classList.contains('shopify-section--footer'))
      );

      if (!targetSlides.length) {
        this.dispatchReadyEvent(null);
        return;
      }

      let editorialContainer = this.container.querySelector(`.${this.classes.editorialSwiper}`);
      if (!editorialContainer) {
        editorialContainer = document.createElement('div');
        editorialContainer.className = `${this.classes.swiper} ${this.classes.fullpageSwiper} ${this.classes.editorialSwiper}`;

        const wrapper = document.createElement('div');
        wrapper.className = `${this.classes.swiperWrapper} ${this.classes.fullpageWrapper}`;

        targetSlides.forEach((section) => {
          section.classList.add(this.classes.swiperSlide, this.classes.fullpageSlide);
          wrapper.appendChild(section);
        });

        editorialContainer.appendChild(wrapper);
        this.container.appendChild(editorialContainer);
      }
      this.editorialContainer = editorialContainer;
      this.wrapper = editorialContainer.querySelector(`.${this.classes.swiperWrapper}`);
      this.slides = targetSlides;

      this.initSwiperInstance(this.editorialContainer);
      this.bindHybridScrollEvents();
    }

    initSwiperInstance(targetElement) {
      if (!window.Swiper || !targetElement) return;

      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      this.swiper = new window.Swiper(targetElement, {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 600,
        effect: 'creative',
        creativeEffect: {
          prev: {
            shadow: false,
            translate: [0, 0, -1]
          },
          next: {
            translate: [0, '100%', 0]
          }
        },
        mousewheel: {
          releaseOnEdges: true,
          sensitivity: 0.8,
          thresholdDelta: 15,
          thresholdTime: 400,
          forceToAxis: true
        },
        touchReleaseOnEdges: true,
        resistanceRatio: 0.65,
        watchOverflow: true,
        nested: true,
        a11y: {
          enabled: true,
          prevSlideMessage: 'Previous section',
          nextSlideMessage: 'Next section',
          firstSlideMessage: 'This is the first section',
          lastSlideMessage: 'This is the last section',
          slideLabelMessage: 'Section {{index}} of {{slidesLength}}',
          itemRoleDescriptionMessage: 'section',
          containerRoleDescriptionMessage: 'fullpage scroll'
        },
        keyboard: {
          enabled: true,
          onlyInViewport: true,
          pageUpDown: true
        },
        followFinger: true,
        passiveListeners: true,
        on: {
          init: (sw) => {
            this.handleSlideChange(sw);
            const activeSlide = sw.slides[sw.activeIndex];
            if (activeSlide && !this.isProductPage) {
              this.updateHeaderContrast(activeSlide);
            }
            this.notifySlideChange(sw);
          },
          slideChangeTransitionStart: (sw) => {
            window._swiperIsTransitioning = true;
            this.handleSlideChange(sw);
            const activeSlide = sw.slides[sw.activeIndex];
            if (activeSlide && !this.isProductPage) {
              this.updateHeaderContrast(activeSlide);
            }
            this.notifySlideChange(sw);
          },
          slideChangeTransitionEnd: (sw) => {
            window._swiperIsTransitioning = false;
            const activeSlide = sw.slides[sw.activeIndex];
            if (activeSlide) {
              this.updateHeaderContrast(activeSlide);
            }
          },
          transitionStart: () => {
            window._swiperIsTransitioning = true;
          },
          transitionEnd: () => {
            window._swiperIsTransitioning = false;
          }
        }
      });

      this.dispatchReadyEvent(this.swiper);
    }

    bindHybridScrollEvents() {
      if (!this.isProductPage || !this.pdpSection || !this.editorialContainer) return;
      const { signal } = this.abortController;

      const activateEditorial = () => {
        if (this.state === FullpageScrollController.states.TO_EDITORIAL || this.state === FullpageScrollController.states.EDITORIAL_IDLE) return;
        this.state = FullpageScrollController.states.TO_EDITORIAL;

        document.body.classList.add(this.classes.pdpPinned, this.classes.pdpTransitioning, this.classes.editorialActive);

        if (this.pdpSection) {
          this.pdpSection.setAttribute('aria-hidden', 'true');
        }

        if (this.swiper) {
          this.swiper.slideTo(0, 0);
          if (this.swiper.mousewheel && typeof this.swiper.mousewheel.disable === 'function') {
            this.swiper.mousewheel.disable();
          }
          const activeSlide = this.swiper.slides[0];
          if (activeSlide) {
            this.updateHeaderContrast(activeSlide);
            this.manageVideos(activeSlide);
          }
        }

        setTimeout(() => {
          document.body.classList.remove(this.classes.pdpTransitioning);
          if (this.swiper && this.swiper.mousewheel && typeof this.swiper.mousewheel.enable === 'function') {
            this.swiper.mousewheel.enable();
          }
          this.state = FullpageScrollController.states.EDITORIAL_IDLE;
        }, this.config.animationDuration);
      };

      const deactivateEditorial = () => {
        if (this.state === FullpageScrollController.states.TO_PDP || this.state === FullpageScrollController.states.PDP_IDLE) return;
        this.state = FullpageScrollController.states.TO_PDP;

        document.body.classList.add(this.classes.pdpTransitioning);
        document.body.classList.remove(this.classes.editorialActive);

        if (this.pdpSection) {
          this.pdpSection.removeAttribute('aria-hidden');
        }

        if (this.swiper && this.swiper.mousewheel && typeof this.swiper.mousewheel.disable === 'function') {
          this.swiper.mousewheel.disable();
        }

        if (window.headerContrastController && typeof window.headerContrastController.detectSectionMode === 'function') {
          window.headerContrastController.detectSectionMode();
        }

        document.dispatchEvent(new CustomEvent(this.events.fromEditorial));

        setTimeout(() => {
          document.body.classList.remove(this.classes.pdpTransitioning, this.classes.pdpPinned);
          if (this.swiper && this.swiper.mousewheel && typeof this.swiper.mousewheel.enable === 'function') {
            this.swiper.mousewheel.enable();
          }
          this.state = FullpageScrollController.states.PDP_IDLE;
        }, this.config.animationDuration);
      };

      // Listen for Mobile Events from main-product-new.js
      document.addEventListener(this.events.sheetBottomOverscroll, activateEditorial, { signal });
      document.addEventListener(this.events.toEditorial, activateEditorial, { signal });
      document.addEventListener(this.events.fromEditorial, deactivateEditorial, { signal });

      // Listen for Mobile Swipe Down on Editorial Container to return to PDP
      if (this.editorialContainer) {
        let edTouchStartY = 0;
        let edTouchStartX = 0;
        
        this.editorialContainer.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches.length > 0) {
            edTouchStartY = e.touches[0].clientY;
            edTouchStartX = e.touches[0].clientX;
          }
        }, { passive: true, signal });

        this.editorialContainer.addEventListener('touchend', (e) => {
          if (!e.changedTouches || e.changedTouches.length === 0) return;
          const diffY = edTouchStartY - e.changedTouches[0].clientY; // > 0 is swipe up, < 0 is swipe down
          const diffX = Math.abs(edTouchStartX - e.changedTouches[0].clientX);
          
          const isMobile = window.matchMedia(`(max-width: ${this.config.mobileBreakpoint}px)`).matches;
          if (isMobile && this.state === FullpageScrollController.states.EDITORIAL_IDLE) {
            // User swipes DOWN to go UP to PDP (return back)
            if (this.swiper && this.swiper.activeIndex === 0 && diffY < -this.config.mobileSwipeThreshold && diffX < Math.abs(diffY) * 0.8) {
              deactivateEditorial();
            }
          }
        }, { passive: true, signal });
      }

      const handleWheel = (e) => {
        // Prevent action if scrolling inside modals/drawers
        if (e.target.closest(this.selectors.ignoreScrollElements)) {
          return;
        }

        const isMobile = window.matchMedia(`(max-width: ${this.config.mobileBreakpoint}px)`).matches;
        
        if (this.state === FullpageScrollController.states.TO_EDITORIAL || this.state === FullpageScrollController.states.TO_PDP) {
          if (e.cancelable && !isMobile) e.preventDefault();
          return;
        }

        if (this.state === FullpageScrollController.states.EDITORIAL_IDLE) {
          if (isMobile) return;

          // Absorb momentum to prevent skipping the first slide and exiting prematurely
          if (this.swiper && this.swiper.activeIndex === 0 && e.deltaY < 0) {
            const timeSinceSlideChange = Date.now() - (this.lastSlideChangeTime || 0);

            // Block exit for 800ms after arriving at slide 0 to absorb Mac trackpad momentum
            if (timeSinceSlideChange > 800) {
              this.wheelDeltaAccumulatorUp = (this.wheelDeltaAccumulatorUp || 0) + e.deltaY;
              
              if (this.wheelDeltaAccumulatorUp < -this.config.desktopWheelThreshold) {
                if (e.cancelable) e.preventDefault();
                deactivateEditorial();
                this.wheelDeltaAccumulatorUp = 0;
              }
            } else {
              // Still cooling down from previous slide change, absorb momentum
              if (e.cancelable) e.preventDefault();
              this.wheelDeltaAccumulatorUp = 0;
            }
          } else {
            this.wheelDeltaAccumulatorUp = 0;
          }
          return;
        }

        // We only care about desktop wheel logic in this file
        if (isMobile) return;

        const isAtPageBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 30);
        const contentCol = document.querySelector(this.selectors.pdpContent);
        const isContentAtBottom = contentCol ? (contentCol.scrollTop + contentCol.clientHeight >= contentCol.scrollHeight - 20) : true;

        if (isAtPageBottom && isContentAtBottom) {
          if (e.deltaY > 0) {
            this.wheelDeltaAccumulator += e.deltaY;
            if (this.wheelDeltaAccumulator > this.config.desktopWheelThreshold) {
              if (e.cancelable) e.preventDefault();
              activateEditorial();
              this.wheelDeltaAccumulator = 0;
            } else {
              if (e.cancelable) e.preventDefault(); // Stop native scroll while accumulating
            }
          } else {
            this.wheelDeltaAccumulator = 0;
          }
          
          if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
          this.wheelTimeout = setTimeout(() => {
            this.wheelDeltaAccumulator = 0;
          }, 300);
        } else {
          this.wheelDeltaAccumulator = 0;
        }
      };

      window.addEventListener('wheel', handleWheel, { passive: false, signal });
    }

    handleSlideChange(swiperInstance) {
      this.lastSlideChangeTime = Date.now();
      const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
      if (!activeSlide) return;

      this.manageVideos(activeSlide);
    }

    notifySlideChange(swiperInstance) {
      const total = swiperInstance.slides ? swiperInstance.slides.length : 0;
      let isLastSlide = total > 0 && swiperInstance.activeIndex === total - 1;
      if (this.isProductPage && !document.body.classList.contains(this.classes.editorialActive)) {
        isLastSlide = false;
      }
      document.dispatchEvent(new CustomEvent('fullpage:slideChange', {
        detail: { isLastSlide, activeIndex: swiperInstance.activeIndex }
      }));
    }

    updateHeaderContrast(activeSlide) {
      let mode = activeSlide.getAttribute('data-header-mode');

      if (!mode) {
        const contrastChild = activeSlide.querySelector(this.selectors.headerContrastElements);
        if (contrastChild) {
          mode = contrastChild.getAttribute('data-header-mode');
        }
      }

      mode = mode || 'dark';

      if (window.headerContrastController && typeof window.headerContrastController.updateContrast === 'function') {
        window.headerContrastController.updateContrast(mode, false);
      } else if (window.SolaceHeaderContrast) {
        const header = document.querySelector(this.selectors.header);
        if (header) {
          header.setAttribute('data-header-mode', mode);
          header.setAttribute('data-header-split', 'false');
        }
      }
    }

    manageVideos(activeSlide) {
      if (this.wrapper) {
        const allVideos = this.wrapper.querySelectorAll(this.selectors.videos);
        allVideos.forEach((video) => {
          if (!activeSlide.contains(video)) {
            try {
              video.pause();
            } catch (e) {
              console.log('errors: ', e);
            }
          }
        });
      }

      const activeVideos = activeSlide.querySelectorAll(this.selectors.videos);
      activeVideos.forEach((video) => {
        try {
          if (video.paused && video.getAttribute('autoplay') !== null) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          }
        } catch (e) {
          console.log('errors: ', e);
        }
      });
    }

    dispatchReadyEvent(swiperInstance) {
      document.dispatchEvent(new CustomEvent('fullpage:ready', {
        detail: { instance: this, swiper: swiperInstance }
      }));
    }

    bindThemeEditorEvents() {
      const { signal } = this.abortController;

      const refresh = () => {
        if (this.swiper) {
          this.setup();
        }
      };

      document.addEventListener('shopify:section:load', refresh, { signal });
      document.addEventListener('shopify:section:reorder', refresh, { signal });
      document.addEventListener('shopify:section:select', (e) => {
        refresh();
        const sectionId = e.detail?.sectionId;
        if (sectionId && this.swiper && this.slides) {
          const index = this.slides.findIndex((s) => s.id === `shopify-section-${sectionId}`);
          if (index !== -1) {
            this.swiper.slideTo(index);
          }
        }
      }, { signal });
    }

    resetDOMElements() {
      if (!this.container) return;
      const fullpageSwipers = this.container.querySelectorAll(`.${this.classes.fullpageSwiper}`);
      fullpageSwipers.forEach((swiperEl) => {
        const wrapper = swiperEl.querySelector(`.${this.classes.swiperWrapper}`);
        if (wrapper) {
          const slides = Array.from(wrapper.children);
          slides.forEach((slide) => {
            slide.classList.remove(this.classes.swiperSlide, this.classes.fullpageSlide);
            this.container.appendChild(slide);
          });
        }
        swiperEl.remove();
      });

      // After destroying swiper, the footer slide is on top of the child DOM list.
      // Push the footer slide on mobile to the bottom of the DOM list.
      const footerSlide = this.container.querySelector('.shopify-section--footer');
      if (footerSlide) this.container.append(footerSlide);

      this.wrapper = null;
      this.slides = [];
      this.editorialContainer = null;
    }

    destroy() {
      window._swiperIsTransitioning = false;
      document.body.classList.remove(this.classes.editorialActive, this.classes.pdpTransitioning, this.classes.pdpPinned);
      this.state = FullpageScrollController.states.PDP_IDLE;
      if (this.pdpSection) {
        this.pdpSection.removeAttribute('aria-hidden');
      }
      if (this.swiper) {
        try {
          this.swiper.destroy(true, true);
        } catch (e) {
          console.log('errors: ', e);
        }
        this.swiper = null;
      }
      this.resetDOMElements();
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = new AbortController();
      }
    }
  }

  window.FullpageScrollController = FullpageScrollController;
  window.FullpageScroll = FullpageScrollController;

  const initFullpageScroll = () => {
    if (!window.fullpageScrollInstance) {
      window.fullpageScrollInstance = new FullpageScrollController();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFullpageScroll);
  } else {
    initFullpageScroll();
  }
}

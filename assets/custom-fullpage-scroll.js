/**
 * Hybrid Fullpage Scroll Controller using Swiper
 */

if (!window.FullpageScrollController) {
  class FullpageScrollController {
    static selectors = {
      mainContent: '#MainContent',
      childSections: ':scope > .shopify-section, :scope > div:not(.swiper-wrapper)',
      headerContrastElements: '[data-header-mode]',
      header: '.js-header',
      pdpMain: '.pdp-new__main',
      pdpNew: '.pdp-new',
      videos: 'video'
    };

    static classes = {
      swiper: 'swiper',
      fullpageSwiper: 'fullpage-swiper',
      editorialSwiper: 'pdp-editorial-swiper',
      swiperWrapper: 'swiper-wrapper',
      fullpageWrapper: 'fullpage-wrapper',
      swiperSlide: 'swiper-slide',
      fullpageSlide: 'fullpage-slide',
      shopifySection: 'shopify-section'
    };

    constructor() {
      this.selectors = FullpageScrollController.selectors;
      this.classes = FullpageScrollController.classes;
      this.swiper = null;
      this.container = document.querySelector(this.selectors.mainContent);
      this.wrapper = null;
      this.slides = [];
      this.pdpSection = null;
      this.editorialContainer = null;
      this.isProductPage = false;
      this.abortController = new AbortController();
      this.footerBreakpoint = 768;

      if (this.canActivate()) {
        this.init();
      }
    }

    canActivate() {
      return document.body.hasAttribute('data-fullpage-scroll') && !!this.container;
    }

    init() {
      if (!window.Swiper) {
        const checkSwiper = setInterval(() => {
          if (window.Swiper) {
            clearInterval(checkSwiper);
            this.setup();
          }
        }, 50);

        setTimeout(() => clearInterval(checkSwiper), 5000);
        return;
      }

      this.setup();
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
        resistanceRatio: 0.85,
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
            this.handleSlideChange(sw);
            this.notifySlideChange(sw);
          },
          slideChangeTransitionEnd: (sw) => {
            const activeSlide = sw.slides[sw.activeIndex];
            if (activeSlide) {
              this.updateHeaderContrast(activeSlide);
            }
          }
        }
      });

      this.dispatchReadyEvent(this.swiper);
    }

    bindHybridScrollEvents() {
      if (!this.isProductPage || !this.pdpSection || !this.editorialContainer) return;
      const { signal } = this.abortController;

      let isTransitioning = false;
      let isBlockedByPDPTransition = false;

      document.addEventListener('pdp:transition:to-editorial', () => {
        isBlockedByPDPTransition = true;
        setTimeout(() => {
          isBlockedByPDPTransition = false;
        }, 550);
      }, { signal });

      const handleWheel = (e) => {
        if (isTransitioning) {
          if (e.cancelable) e.preventDefault();
          return;
        }

        const pdpBottom = this.editorialContainer ? this.editorialContainer.offsetTop : (this.pdpSection.offsetTop + this.pdpSection.offsetHeight);
        const currentScrollY = window.scrollY;
        const viewportBottom = currentScrollY + window.innerHeight;

        if (this.swiper && this.swiper.activeIndex === 0 && e.deltaY < -15) {
          if (currentScrollY >= pdpBottom - 60) {
            if (e.cancelable) e.preventDefault();
            isTransitioning = true;

            if (window.innerWidth <= 900) {
              document.dispatchEvent(new CustomEvent('pdp:transition:from-editorial'));
            } else {
              window.scrollTo({
                top: Math.max(0, pdpBottom - window.innerHeight - 80),
                behavior: 'smooth'
              });
            }

            setTimeout(() => {
              isTransitioning = false;
            }, 700);
            return;
          }
        }

        if (currentScrollY < pdpBottom - 30 && viewportBottom >= pdpBottom - 20 && e.deltaY > 15) {
          if (this.swiper && this.swiper.activeIndex === 0) {
            if (e.cancelable) e.preventDefault();
            isTransitioning = true;
            window.scrollTo({
              top: pdpBottom,
              behavior: 'smooth'
            });
            setTimeout(() => {
              isTransitioning = false;
              if (this.swiper && this.swiper.slides && this.swiper.slides[0]) {
                this.updateHeaderContrast(this.swiper.slides[0]);
              }
            }, 700);
            return;
          }
        }
      };

      let touchStartY = 0;
      let isTouchDown = false;

      const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
          touchStartY = e.touches[0].clientY;
          isTouchDown = true;
        }
      };

      const handleTouchMove = (e) => {
        if (!isTouchDown || !e.touches || !e.touches.length === 0 || isTransitioning || isBlockedByPDPTransition) return;
        const currentY = e.touches[0].clientY;
        const diffY = touchStartY - currentY;

        const pdpBottom = this.editorialContainer ? this.editorialContainer.offsetTop : (this.pdpSection.offsetTop + this.pdpSection.offsetHeight);
        const currentScrollY = window.scrollY;
        const viewportBottom = currentScrollY + window.innerHeight;

        if (this.swiper && this.swiper.activeIndex === 0 && diffY < -40) {
          if (currentScrollY >= pdpBottom - 60) {
            isTransitioning = true;
            isTouchDown = false;

            if (window.innerWidth <= 900) {
              document.dispatchEvent(new CustomEvent('pdp:transition:from-editorial'));
            } else {
              window.scrollTo({
                top: Math.max(0, pdpBottom - window.innerHeight - 80),
                behavior: 'smooth'
              });
            }

            setTimeout(() => {
              isTransitioning = false;
              if (window.headerContrastController && typeof window.headerContrastController.detectSectionMode === 'function') {
                window.headerContrastController.detectSectionMode();
              }
            }, 700);
            return;
          }
        }

        if (window.innerWidth <= 900 || (e.target && e.target.closest && e.target.closest('.pdp-new'))) {
          return;
        }

        if (currentScrollY < pdpBottom - 30 && viewportBottom >= pdpBottom - 100 && diffY > 35) {
          if (this.swiper && this.swiper.activeIndex === 0) {
            isTransitioning = true;
            isTouchDown = false;
            window.scrollTo({
              top: pdpBottom,
              behavior: 'smooth'
            });
            setTimeout(() => {
              isTransitioning = false;
              if (this.swiper && this.swiper.slides && this.swiper.slides[0]) {
                this.updateHeaderContrast(this.swiper.slides[0]);
              }
            }, 700);
            return;
          }
        }
      };

      const handleTouchEnd = () => {
        isTouchDown = false;
      };

      window.addEventListener('wheel', handleWheel, { passive: false, signal });
      window.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
      window.addEventListener('touchmove', handleTouchMove, { passive: true, signal });
      window.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
    }

    handleSlideChange(swiperInstance) {
      const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
      if (!activeSlide) return;

      this.manageVideos(activeSlide);
    }

    notifySlideChange(swiperInstance) {
      const total = swiperInstance.slides ? swiperInstance.slides.length : 0;
      const isLastSlide = total > 0 && swiperInstance.activeIndex === total - 1;
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

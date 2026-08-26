/**
 * Hybrid Fullpage Scroll Controller using Swiper
 */

if (!window.FullpageScrollController) {
  class FullpageScrollController {
    static selectors = {
      mainContent: '#MainContent',
      sections: '#MainContent > .shopify-section, #MainContent > .swiper-wrapper > .shopify-section',
      childSections: ':scope > .shopify-section, :scope > div:not(.swiper-wrapper)',
      footerSection: '.shopify-section-group-footer-group, .ft-Footer',
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
      shopifySection: 'shopify-section',
      ftFooter: 'ft-Footer'
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

      this.bindThemeEditorEvents();
    }

    setupIndexFullpage() {
      if (!this.container) return;

      this.container.classList.add(this.classes.swiper, this.classes.fullpageSwiper);

      let wrapper = this.container.querySelector(`:scope > .${this.classes.swiperWrapper}`);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = `${this.classes.swiperWrapper} ${this.classes.fullpageWrapper}`;

        const childSections = Array.from(this.container.querySelectorAll(this.selectors.childSections));
        childSections.forEach((section) => {
          wrapper.appendChild(section);
        });

        this.container.appendChild(wrapper);
      }
      this.wrapper = wrapper;

      const footerEl = document.querySelector(this.selectors.footerSection);
      if (footerEl) {
        const footerSection = footerEl.closest(`.${this.classes.shopifySection}`) || footerEl;
        if (footerSection && footerSection.parentElement !== this.wrapper) {
          this.wrapper.appendChild(footerSection);
        }
      }

      const sections = Array.from(this.wrapper.children).filter((el) => {
        return el.offsetHeight > 20 || el.classList.contains(this.classes.shopifySection) || el.classList.contains(this.classes.ftFooter);
      });

      sections.forEach((section) => {
        section.classList.add(this.classes.swiperSlide, this.classes.fullpageSlide);
      });

      this.slides = sections;

      if (this.slides.length <= 1) {
        this.dispatchReadyEvent(null);
        return;
      }

      this.initSwiperInstance(this.container);
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

      const footerEl = document.querySelector(this.selectors.footerSection);
      const footerSection = footerEl ? (footerEl.closest(`.${this.classes.shopifySection}`) || footerEl) : null;

      const targetSlides = [...editorialSections];
      if (footerSection && !targetSlides.includes(footerSection)) {
        targetSlides.push(footerSection);
      }

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
            translate: [0, '-20%', -1]
          },
          next: {
            translate: [0, '100%', 0]
          }
        },
        mousewheel: {
          releaseOnEdges: !this.isProductPage,
          sensitivity: 0.8,
          thresholdDelta: 15,
          thresholdTime: 400,
          forceToAxis: true
        },
        touchReleaseOnEdges: !this.isProductPage,
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
        passiveListeners: false,
        on: {
          init: (sw) => {
            this.handleSlideChange(sw);
            const activeSlide = sw.slides[sw.activeIndex];
            if (activeSlide && !this.isProductPage) {
              this.updateHeaderContrast(activeSlide);
            }
          },
          slideChangeTransitionStart: (sw) => {
            this.handleSlideChange(sw);
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
            window.scrollTo({
              top: Math.max(0, pdpBottom - window.innerHeight - 80),
              behavior: 'smooth'
            });
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
        if (!isTouchDown || !e.touches || e.touches.length === 0 || isTransitioning) return;
        const currentY = e.touches[0].clientY;
        const diffY = touchStartY - currentY;

        const pdpBottom = this.editorialContainer ? this.editorialContainer.offsetTop : (this.pdpSection.offsetTop + this.pdpSection.offsetHeight);
        const currentScrollY = window.scrollY;
        const viewportBottom = currentScrollY + window.innerHeight;

        if (this.swiper && this.swiper.activeIndex === 0 && diffY < -40) {
          if (currentScrollY >= pdpBottom - 60) {
            isTransitioning = true;
            isTouchDown = false;
            window.scrollTo({
              top: Math.max(0, pdpBottom - window.innerHeight - 80),
              behavior: 'smooth'
            });
            setTimeout(() => {
              isTransitioning = false;
              if (window.headerContrastController && typeof window.headerContrastController.detectSectionMode === 'function') {
                window.headerContrastController.detectSectionMode();
              }
            }, 700);
            return;
          }
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

    destroy() {
      if (this.swiper) {
        try {
          this.swiper.destroy(true, true);
        } catch (e) {
          console.log('errors: ', e);
        }
        this.swiper = null;
      }
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

if (!customElements.get('two-ups-media')) {
  class TwoUpsMedia extends HTMLElement {
    static config = {
      breakpoint: 900,
      speed: 600,
      swipeThreshold: 40,
      wheelThreshold: 35,
      transitionCooldown: 500
    };

    static selectors = {
      swiper: '.js-two-ups-swiper',
      slide: '.js-two-ups-slide',
      video: 'video',
      parentSlide: '.fullpage-slide, .shopify-section',
      header: '.js-header'
    };

    static classes = {
      swiper: 'swiper',
      swiperWrapper: 'swiper-wrapper',
      slide: 'swiper-slide',
      sliderActive: 'two-ups-media--slider'
    };

    static events = {
      fullpageReady: 'fullpage:ready',
      fullpageSlideChange: 'fullpage:slideChange',
      fullpageLock: 'fullpage:lock',
      fullpageUnlock: 'fullpage:unlock',
      fullpageNextSlide: 'fullpage:nextSlide',
      fullpagePrevSlide: 'fullpage:prevSlide'
    };

    constructor() {
      super();
      this.swiper = null;
      this.swiperEl = null;
      this.abortController = null;
      this.mq = null;
      this.lastOuterIndex = null;
      this.touchStartY = 0;
      this.touchStartX = 0;
      this.touchStartIndex = null;
      this.wheelAccumulator = 0;
      this.wheelTimeout = null;
      this.lastTransitionTime = 0;
    }

    connectedCallback() {
      const mobileLayout = this.getAttribute('data-mobile-layout') || 'stacked';
      if (mobileLayout !== 'slider') return;

      this.swiperEl = this.querySelector(TwoUpsMedia.selectors.swiper);
      if (!this.swiperEl) return;

      this.abortController = new AbortController();
      this.mq = window.matchMedia(`(max-width: ${TwoUpsMedia.config.breakpoint}px)`);

      this.mq.addEventListener('change', this._onBreakpoint.bind(this), {
        signal: this.abortController.signal
      });

      if (this.mq.matches) {
        this._initSwiper();
      }
      this._bindFullpageEvents();
      this._bindGestures();
      this._syncInitialState();
    }

    _isFullpagePage() {
      return document.body.hasAttribute('data-fullpage-scroll');
    }

    _onBreakpoint(e) {
      if (e.matches) {
        this._initSwiper();
      } else {
        this._destroySwiper();
        this._unlockHP();
      }
    }

    _awaitSwiper() {
      if (window.Swiper) return Promise.resolve(window.Swiper);
      return new Promise((resolve) => {
        let tries = 0;
        const id = setInterval(() => {
          if (window.Swiper) {
            clearInterval(id);
            resolve(window.Swiper);
          } else if (++tries >= 100) {
            clearInterval(id);
            resolve(null);
          }
        }, 50);
      });
    }

    async _initSwiper() {
      if (this.swiper) return;
      const slides = this.querySelectorAll(TwoUpsMedia.selectors.slide);
      if (slides.length <= 1) return;

      const Swiper = await this._awaitSwiper();
      if (!Swiper || this.swiper || !this.mq?.matches) return;

      const isFullpage = this._isFullpagePage();

      this.swiper = new Swiper(this.swiperEl, {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        speed: TwoUpsMedia.config.speed,
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
        nested: isFullpage,
        resistanceRatio: 0,
        touchReleaseOnEdges: !isFullpage,
        watchOverflow: true,
        mousewheel: {
          forceToAxis: true,
          releaseOnEdges: !isFullpage
        },
        a11y: {
          enabled: true,
          prevSlideMessage: 'Previous image',
          nextSlideMessage: 'Next image'
        },
        on: {
          init: (sw) => {
            if (this._isCurrentSectionActive()) {
              this._handleSlideChange(sw);
              this._updateHeaderContrast(sw);
            }
          },
          slideChangeTransitionStart: (sw) => {
            window._swiperIsTransitioning = true;
            this.lastTransitionTime = Date.now();
            this._handleSlideChange(sw);
            this._updateHeaderContrast(sw);
          },
          slideChangeTransitionEnd: (sw) => {
            window._swiperIsTransitioning = false;
            this._updateHeaderContrast(sw);
          }
        }
      });

      if (this._isCurrentSectionActive()) {
        this._lockHP();
      }
    }

    _destroySwiper() {
      if (!this.swiper) return;
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    _getMySectionIndex() {
      const parentSlide = this.closest(TwoUpsMedia.selectors.parentSlide);
      if (!parentSlide || !parentSlide.parentElement) return -1;
      const siblings = Array.from(parentSlide.parentElement.children);
      return siblings.indexOf(parentSlide);
    }

    _isCurrentSectionActive() {
      if (!this._isFullpagePage()) return true;
      const myIndex = this._getMySectionIndex();
      if (myIndex === -1) return false;
      return this.lastOuterIndex === myIndex;
    }

    _lockHP() {
      if (!this._isFullpagePage()) return;
      document.dispatchEvent(new CustomEvent(TwoUpsMedia.events.fullpageLock));
    }

    _unlockHP() {
      if (!this._isFullpagePage()) return;
      document.dispatchEvent(new CustomEvent(TwoUpsMedia.events.fullpageUnlock));
    }

    _nextHP() {
      if (!this._isFullpagePage()) return;
      this.lastTransitionTime = Date.now();
      document.dispatchEvent(new CustomEvent(TwoUpsMedia.events.fullpageNextSlide));
    }

    _prevHP() {
      if (!this._isFullpagePage()) return;
      this.lastTransitionTime = Date.now();
      document.dispatchEvent(new CustomEvent(TwoUpsMedia.events.fullpagePrevSlide));
    }

    _bindGestures() {
      if (!this.swiperEl) return;
      const { signal } = this.abortController;

      this.swiperEl.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          this.touchStartY = e.touches[0].clientY;
          this.touchStartX = e.touches[0].clientX;
          this.touchStartIndex = this.swiper ? this.swiper.activeIndex : null;
        }
      }, { passive: true, signal });

      this.swiperEl.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        if (!this.mq?.matches || !this.swiper) return;
        if (!this._isCurrentSectionActive()) return;
        if (this.touchStartIndex === null) return;
        if (!this._isFullpagePage()) return;

        if (Date.now() - this.lastTransitionTime < TwoUpsMedia.config.transitionCooldown) return;

        const diffY = this.touchStartY - e.changedTouches[0].clientY;
        const diffX = Math.abs(this.touchStartX - e.changedTouches[0].clientX);

        if (diffX > Math.abs(diffY) * 0.8) return;

        const threshold = TwoUpsMedia.config.swipeThreshold;
        const totalSlides = this.swiper.slides ? this.swiper.slides.length : 0;
        const isBeginning = this.touchStartIndex === 0;
        const isEnd = totalSlides > 0 && this.touchStartIndex === totalSlides - 1;

        if (diffY > threshold && isEnd) {
          this._unlockHP();
          this._nextHP();
        } else if (diffY < -threshold && isBeginning) {
          this._unlockHP();
          this._prevHP();
        }

        this.touchStartIndex = null;
      }, { passive: true, signal });

      this.swiperEl.addEventListener('wheel', (e) => {
        if (!this.mq?.matches || !this.swiper) return;
        if (!this._isCurrentSectionActive()) return;

        if (Date.now() - this.lastTransitionTime < TwoUpsMedia.config.transitionCooldown) {
          this.wheelAccumulator = 0;
          return;
        }

        const threshold = TwoUpsMedia.config.wheelThreshold;
        this.wheelAccumulator += e.deltaY;

        if (this.wheelAccumulator > threshold) {
          this.wheelAccumulator = 0;
          if (this.swiper.isEnd) {
            this._unlockHP();
            this._nextHP();
          } else {
            this._lockHP();
            this.swiper.slideNext();
          }
        } else if (this.wheelAccumulator < -threshold) {
          this.wheelAccumulator = 0;
          if (this.swiper.isBeginning) {
            this._unlockHP();
            this._prevHP();
          } else {
            this._lockHP();
            this.swiper.slidePrev();
          }
        }

        if (this.wheelTimeout) clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(() => {
          this.wheelAccumulator = 0;
        }, 400);
      }, { passive: true, signal });
    }

    _handleActiveState(currentIndex) {
      const myIndex = this._getMySectionIndex();
      if (myIndex === -1) return;

      const isNowActive = myIndex === currentIndex;

      if (isNowActive) {
        const slidesCount = this.querySelectorAll(TwoUpsMedia.selectors.slide).length;

        if (this.swiper && typeof this.lastOuterIndex === 'number') {
          if (this.lastOuterIndex > currentIndex) {
            this.swiper.slideTo(slidesCount - 1, 0);
          } else if (this.lastOuterIndex < currentIndex) {
            this.swiper.slideTo(0, 0);
          }
        }

        if (this.mq?.matches && this.swiper) {
          this._lockHP();
          this._handleSlideChange(this.swiper);
          this._updateHeaderContrast(this.swiper);
        }
      } else {
        if (this.lastOuterIndex === myIndex) {
          this._unlockHP();
        }
        this._pauseVideos();
      }

      this.lastOuterIndex = currentIndex;
    }

    _syncInitialState() {
      if (!this._isFullpagePage()) return;
      const initialIndex = window.fullpageScrollInstance?.swiper?.activeIndex ?? 0;
      this._handleActiveState(initialIndex);
    }

    _bindFullpageEvents() {
      const { signal } = this.abortController;

      document.addEventListener(TwoUpsMedia.events.fullpageSlideChange, (e) => {
        const currentIndex = e.detail?.activeIndex;
        if (typeof currentIndex !== 'number') return;
        this._handleActiveState(currentIndex);
      }, { signal });

      document.addEventListener(TwoUpsMedia.events.fullpageReady, (e) => {
        const initialIndex = e.detail?.swiper?.activeIndex ?? 0;
        this._handleActiveState(initialIndex);
      }, { signal });
    }

    _updateHeaderContrast(swiper) {
      if (!swiper || !swiper.slides) return;
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const mode = activeSlide.getAttribute('data-header-mode') || this.getAttribute('data-header-mode') || 'dark';

      if (window.headerContrastController && typeof window.headerContrastController.updateContrast === 'function') {
        window.headerContrastController.updateContrast(mode, false);
      } else if (window.SolaceHeaderContrast) {
        const header = document.querySelector(TwoUpsMedia.selectors.header);
        if (header) {
          header.setAttribute('data-header-mode', mode);
          header.setAttribute('data-header-split', 'false');
        }
      }
    }

    _handleSlideChange(swiper) {
      if (!swiper || !swiper.slides) return;
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const allVideos = this.querySelectorAll(TwoUpsMedia.selectors.video);
      allVideos.forEach((video) => {
        if (!activeSlide.contains(video)) {
          try { video.pause(); } catch (e) {}
        }
      });

      const activeVideos = activeSlide.querySelectorAll(TwoUpsMedia.selectors.video);
      activeVideos.forEach((video) => {
        try {
          if (video.paused && video.getAttribute('autoplay') !== null) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          }
        } catch (e) {}
      });
    }

    _pauseVideos() {
      const allVideos = this.querySelectorAll(TwoUpsMedia.selectors.video);
      allVideos.forEach((video) => {
        try { video.pause(); } catch (e) {}
      });
    }

    disconnectedCallback() {
      this._unlockHP();
      this.abortController?.abort();
      this._destroySwiper();
    }
  }

  customElements.define('two-ups-media', TwoUpsMedia);
}

/**
 * <product-fullscreen> Section Container Component
 */

if (!customElements.get('product-fullscreen')) {
  class ProductFullscreen extends HTMLElement {
    static selectors = {
      mediaGallery: '.js-pdp-media-gallery',
      mediaList: '.js-pdp-media-list',
      mediaItems: '.js-pdp-media-item',
      swiper: '.js-pdp-swiper',
      slides: '.js-pdp-slide',
      videos: '.js-pdp-video',
      galleryColumn: '.js-pdp-gallery-column',
      contentColumn: '.js-pdp-content-column',
      sheetHandle: '.js-pdp-sheet-handle',
      header: '.hd-Header',
      zoomTriggers: '.js-pdp-media-zoom-trigger',
      zoomModal: '.js-pdp-zoom-modal',
      zoomClose: '.js-pdp-zoom-close',
      zoomItems: '.js-pdp-zoom-item',
      priceContainer: '.js-pdp-price-row',
      stockStatus: '.js-pdp-stock-status',
      moveDrawers: '[data-module-drawers-move-me="root"]',
      rootDrawers: '.drw-Drawers[data-module="drawers"]'
    };

    static classes = {
      modalActive: 'is-active',
      scrollLocked: 'is-scroll-locked',
      galleryLocked: 'is-locked',
      contentExpanded: 'is-content-expanded',
      contentLockedTop: 'is-locked-top',
      zoomModalActive: 'is-zoom-modal-active'
    };

    constructor() {
      super();

      this.selectors = ProductFullscreen.selectors;
      this.classes = ProductFullscreen.classes;
      this.swiper = null;
      this.swiperInitTimer = null;
      this.canLeaveLastSlide = false;
      this.lastSlideCooldownTimer = null;
      window._pdpCanTransitionToEditorial = false;
    }

    isDesktop() {
      return window.matchMedia('(min-width: 901px)').matches;
    }

    isMobile() {
      return !this.isDesktop();
    }

    connectedCallback() {
      this.abortController = new AbortController();

      this.initMediaObserver();
      this.initGallerySwiper();
      this.initMobileScrollController();
      this.initContentColumnDesktopScroll();
      this.initZoomModal();
      this.initDrawersMovement();

      this.addEventListener('variant:change', (e) => {
        const { price, comparePrice, inventoryQty } = e.detail;
        this.updateExternalPriceAndStock(price, comparePrice, inventoryQty);
      }, { signal: this.abortController.signal });

      window.addEventListener('pdp:zoom:open', (e) => {
        const index = e.detail && typeof e.detail.index !== 'undefined' ? e.detail.index : 0;
        this.openZoomModal(index);
      }, { signal: this.abortController.signal });

      this.mql = window.matchMedia('(min-width: 901px)');
      this.handleMediaChange = () => {
        if (this.swiper) {
          this.swiper.update();
        }
      };

      this.mql.addEventListener('change', this.handleMediaChange);
    }

    initContentColumnDesktopScroll() {
      const contentCol = this.querySelector(this.selectors.contentColumn);
      if (!contentCol) return;
      const { signal } = this.abortController;

      // Content column is a secondary signal — only grants canLeave.
      // Gallery Swiper owns the authoritative _pdpCanTransitionToEditorial state.
      const checkContentBottom = () => {
        if (this.isMobile()) return;
        const atBottom = contentCol.scrollTop + contentCol.clientHeight >= contentCol.scrollHeight - 15;
        if (atBottom && this.canLeaveLastSlide) {
          // Both gallery AND content are at end — safe to allow transition
          window._pdpCanTransitionToEditorial = true;
          document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: true } }));
        }
      };

      contentCol.addEventListener('scroll', checkContentBottom, { passive: true, signal });

      contentCol.addEventListener('wheel', (e) => {
        if (this.isMobile()) return;
        if (window._swiperIsTransitioning) return;
        const atBottom = contentCol.scrollTop + contentCol.clientHeight >= contentCol.scrollHeight - 5;
        if (atBottom && e.deltaY > 20) {
          document.dispatchEvent(new CustomEvent('pdp:slide-next'));
        }
      }, { passive: true, signal });
    }

    updateExternalPriceAndStock(price, comparePrice, inventoryQty) {
      const priceContainer = this.querySelector(this.selectors.priceContainer);
      const stockStatus = this.querySelector(this.selectors.stockStatus);

      if (priceContainer && price) {
        const compNum = comparePrice ? parseFloat(comparePrice.replace(/[^0-9.]/g, '')) : 0;
        const priceNum = price ? parseFloat(price.replace(/[^0-9.]/g, '')) : 0;

        if (comparePrice && compNum > priceNum) {
          const discount = Math.round(((compNum - priceNum) / compNum) * 100);
          const discountHtml = discount > 0 ? `<span class="pdp-content__price-discount prd-Card_Kicker-red text-reg-14">${discount}% off</span>` : '';
          priceContainer.innerHTML = `
            <span class="pdp-content__price-wrapper">
              <s class="pdp-content__price-compare prd-Price_Compare text-reg-14">${comparePrice}</s>
              <span class="pdp-content__price-sale prd-Card_Kicker-red text-reg-14">${price}</span>
            </span>
            ${discountHtml}
          `;
        } else {
          priceContainer.innerHTML = `<span class="pdp-content__price-regular text-reg-14">${price}</span>`;
        }
      }

      if (stockStatus) {
        if (inventoryQty > 0 && inventoryQty < 10) {
          stockStatus.setAttribute('aria-hidden', 'false');
        } else {
          stockStatus.setAttribute('aria-hidden', 'true');
        }
      }
    }

    initGallerySwiper() {
      if (this.swiper) return;

      const swiperEl = this.querySelector(this.selectors.swiper);
      if (!swiperEl) return;

      const slideCount = this.querySelectorAll(this.selectors.slides).length;
      if (slideCount <= 1) return;

      let retries = 0;
      const maxRetries = 50;

      const init = () => {
        if (typeof window.Swiper === 'undefined') {
          if (retries < maxRetries) {
            retries++;
            this.swiperInitTimer = setTimeout(init, 50);
          }
          return;
        }

        this.swiper = new window.Swiper(swiperEl, {
          direction: 'vertical',
          slidesPerView: 1,
          spaceBetween: 0,
          speed: 600,
          effect: 'creative',
          creativeEffect: {
            prev: {
              shadow: false,
              translate: [0, 0, 0]
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
            prevSlideMessage: 'Previous media',
            nextSlideMessage: 'Next media',
            firstSlideMessage: 'This is the first media item',
            lastSlideMessage: 'This is the last media item',
            slideLabelMessage: 'Media {{index}} of {{slidesLength}}',
            itemRoleDescriptionMessage: 'media item',
            containerRoleDescriptionMessage: 'product media gallery'
          },
          keyboard: {
            enabled: true,
            onlyInViewport: true,
            pageUpDown: true
          },
          followFinger: true,
          passiveListeners: true,
          on: {
            init: (swiper) => {
              this.handleSlideChange(swiper);
              this.updateHeaderContrast(swiper);
              const isAtEnd = swiper.isEnd || swiper.activeIndex >= swiper.slides.length - 1;
              if (isAtEnd) {
                this.lastSlideCooldownTimer = setTimeout(() => {
                  this.canLeaveLastSlide = true;
                  window._pdpCanTransitionToEditorial = true;
                  document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: true } }));
                }, 500);
              } else {
                this.canLeaveLastSlide = false;
                window._pdpCanTransitionToEditorial = false;
                document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: false } }));
              }
            },
            slideChangeTransitionStart: (swiper) => {
              window._swiperIsTransitioning = true;
              this.canLeaveLastSlide = false;
              window._pdpCanTransitionToEditorial = false;
              document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: false } }));
              if (this.lastSlideCooldownTimer) {
                clearTimeout(this.lastSlideCooldownTimer);
                this.lastSlideCooldownTimer = null;
              }
              this.handleSlideChange(swiper);
              this.updateHeaderContrast(swiper);
            },
            slideChangeTransitionEnd: (swiper) => {
              window._swiperIsTransitioning = false;
              this.updateHeaderContrast(swiper);
              const isAtEnd = swiper.isEnd || swiper.activeIndex >= swiper.slides.length - 1;

              if (isAtEnd) {
                if (this.lastSlideCooldownTimer) {
                  clearTimeout(this.lastSlideCooldownTimer);
                }
                this.lastSlideCooldownTimer = setTimeout(() => {
                  this.canLeaveLastSlide = true;
                  window._pdpCanTransitionToEditorial = true;
                  document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: true } }));
                }, 500);
              } else {
                this.canLeaveLastSlide = false;
                window._pdpCanTransitionToEditorial = false;
                document.dispatchEvent(new CustomEvent('pdp:can-transition', { detail: { canLeave: false } }));
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

        swiperEl.addEventListener('wheel', (e) => {
          if (this.isMobile()) return;
          if (window._swiperIsTransitioning) return;
          if (this.canLeaveLastSlide && e.deltaY > 20) {
            document.dispatchEvent(new CustomEvent('pdp:slide-next'));
          }
        }, { passive: true, signal: this.abortController.signal });
      };

      init();
    }

    handleSlideChange(swiper) {
      if (!swiper || !swiper.slides) return;
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const allVideos = this.querySelectorAll(this.selectors.videos) || [];

      allVideos.length > 0 && allVideos.forEach((video) => {
        if (video.closest('.swiper-slide') !== activeSlide) {
          try { video.pause(); } catch (_e) {}
        }
      });

      const activeVideo = activeSlide.querySelector(this.selectors.videos);

      if (activeVideo) {
        try {
          activeVideo.play().catch(() => {});
        } catch (_e) {}
      }
    }

    updateHeaderContrast(swiper) {
      if (!swiper || !swiper.slides) return;
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const headerMode = activeSlide.getAttribute('data-header-mode') || 'light';
      if (window.headerContrastController && typeof window.headerContrastController.updateContrast === 'function') {
        window.headerContrastController.updateContrast(headerMode, this.isDesktop());
      }
    }

    updateCurrentHeaderContrast() {
      if (this.swiper) {
        this.updateHeaderContrast(this.swiper);
      } else {
        const activeSlide = this.querySelector('.swiper-slide-active') || this.querySelector(this.selectors.slides);
        const headerMode = activeSlide ? (activeSlide.getAttribute('data-header-mode') || 'light') : 'light';
        if (window.headerContrastController && typeof window.headerContrastController.updateContrast === 'function') {
          window.headerContrastController.updateContrast(headerMode, this.isDesktop());
        }
      }
    }

    canLeaveToEditorial(target) {
      if (this.isMobile()) return false;

      if (target && target.closest(this.selectors.galleryColumn)) {

        if (!this.swiper || !this.swiper.slides || this.swiper.slides.length <= 1) {
          return true;
        }

        return !!window._pdpCanTransitionToEditorial;
      }

      if (target && target.closest(this.selectors.contentColumn)) {
        const contentCol = this.querySelector(this.selectors.contentColumn);

        if (contentCol) {
          return contentCol.scrollTop + contentCol.clientHeight >= contentCol.scrollHeight - 15;
        }

        return true;
      }

      if (!this.swiper || !this.swiper.slides || this.swiper.slides.length <= 1) {
        return true;
      }
      return !!window._pdpCanTransitionToEditorial;
    }

    destroySwiper() {
      window._swiperIsTransitioning = false;
      window._pdpCanTransitionToEditorial = false;
      if (this.lastSlideCooldownTimer) {
        clearTimeout(this.lastSlideCooldownTimer);
        this.lastSlideCooldownTimer = null;
      }
      this.canLeaveLastSlide = false;
      if (this.swiperInitTimer) {
        clearTimeout(this.swiperInitTimer);
        this.swiperInitTimer = null;
      }
      if (this.swiper) {
        try {
          this.swiper.destroy(true, true);
        } catch (_e) {}
        this.swiper = null;
      }
      const galleryColumn = this.querySelector(this.selectors.galleryColumn);
      const contentColumn = this.querySelector(this.selectors.contentColumn);
      if (galleryColumn) {
        galleryColumn.classList.remove(this.classes.galleryLocked);
      }
      if (contentColumn) {
        contentColumn.classList.remove(this.classes.contentLockedTop);
      }
      this.classList.remove(this.classes.contentExpanded);
    }

    initMobileScrollController() {
      const galleryColumn = this.querySelector(this.selectors.galleryColumn);
      const contentColumn = this.querySelector(this.selectors.contentColumn);
      const sheetHandle = this.querySelector(this.selectors.sheetHandle);
      const { signal } = this.abortController;

      let isLocked = false;

      const expandSheet = (animate = true) => {
        if (!this.isMobile() || !contentColumn) return;
        isLocked = true;
        if (this.swiper) this.swiper.allowTouchMove = false;
        if (galleryColumn) galleryColumn.classList.add(this.classes.galleryLocked);
        this.classList.add(this.classes.contentExpanded);
        contentColumn.classList.add(this.classes.contentLockedTop);
      };

      const collapseSheet = (animate = true) => {
        if (!this.isMobile() || !contentColumn) return;
        isLocked = false;
        if (this.swiper) this.swiper.allowTouchMove = true;
        if (galleryColumn) galleryColumn.classList.remove(this.classes.galleryLocked);
        this.classList.remove(this.classes.contentExpanded);
        contentColumn.classList.remove(this.classes.contentLockedTop);
        contentColumn.scrollTop = 0;
      };

      // Tap on Sheet Handle to toggle Peek vs Expanded
      if (sheetHandle) {
        sheetHandle.addEventListener('click', (e) => {
          if (!this.isMobile()) return;
          e.preventDefault();
          if (contentColumn && contentColumn.classList.contains(this.classes.contentLockedTop)) {
            collapseSheet(true);
          } else {
            expandSheet(true);
          }
        }, { signal });
      }

      document.addEventListener('pdp:transition:from-editorial', () => {
        if (!this.isMobile()) return;
        expandSheet(false);
        requestAnimationFrame(() => {
          if (contentColumn) {
            contentColumn.scrollTop = contentColumn.scrollHeight - contentColumn.clientHeight;
          }
        });
      }, { signal });

      let touchStartY = 0;
      let touchStartX = 0;
      let startedAtTop = false;
      let startedAtBottom = false;
      let isTouchActive = false;

      if (contentColumn) {
        if ('ResizeObserver' in window) {
          const resizeObserver = new ResizeObserver(() => {
            if (isTouchActive) {
              startedAtBottom = false;
            }
          });
          resizeObserver.observe(contentColumn);
        }

        contentColumn.addEventListener('touchstart', (e) => {
          if (!this.isMobile() || !e.touches.length) return;
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
          isTouchActive = true;

          const isLockedTop = contentColumn.classList.contains(this.classes.contentLockedTop);
          if (isLockedTop) {
            startedAtTop = contentColumn.scrollTop <= 2;

            const maxScrollable = contentColumn.scrollHeight - contentColumn.clientHeight;
            startedAtBottom = maxScrollable > 5
              ? (contentColumn.scrollTop >= maxScrollable - 5)
              : true;
          } else {
            startedAtTop = false;
            startedAtBottom = false;
          }
        }, { passive: true, signal });

        contentColumn.addEventListener('touchend', (e) => {
          if (!this.isMobile() || !isTouchActive) return;
          isTouchActive = false;

          const changedTouch = e.changedTouches?.[0];
          if (!changedTouch) return;

          const diffY = touchStartY - changedTouch.clientY; // > 0 is swipe up, < 0 is swipe down
          const diffX = Math.abs(touchStartX - changedTouch.clientX);

          const isLockedTop = contentColumn.classList.contains(this.classes.contentLockedTop);

          if (!isLockedTop && diffY > 30 && diffX < diffY * 0.8) {
            expandSheet(true);
            return;
          }

          if (isLockedTop) {
            if (startedAtTop && diffY < -45 && diffX < Math.abs(diffY) * 0.6) {
              collapseSheet(true);
              return;
            }

            if (startedAtBottom && diffY > 40 && diffX < diffY * 0.6) {
              document.dispatchEvent(new CustomEvent('pdp:slide-next'));
            }
          }
        }, { passive: true, signal });
      }

      if (galleryColumn) {
        let galleryTouchStartY = 0;
        let galleryTouchStartX = 0;

        galleryColumn.addEventListener('touchstart', (e) => {
          if (!this.isMobile() || !e.touches.length || isLocked) return;
          galleryTouchStartY = e.touches[0].clientY;
          galleryTouchStartX = e.touches[0].clientX;
        }, { passive: true, signal });

        galleryColumn.addEventListener('touchend', (e) => {
          if (!this.isMobile() || isLocked) return;
          if (!this.swiper) return;

          const atLastSlide = this.swiper.isEnd
            || this.swiper.activeIndex >= this.swiper.slides.length - 1;
          if (!atLastSlide) return;

          const changedTouch = e.changedTouches[0];
          if (!changedTouch) return;

          const diffY = galleryTouchStartY - changedTouch.clientY;
          const diffX = Math.abs(galleryTouchStartX - changedTouch.clientX);

          if (diffY > 40 && diffX < diffY * 0.6) {
            expandSheet(true);
          }
        }, { passive: true, signal });
      }

      // On resize: reset mobile lock state if switched to desktop
      const onResize = () => {
        if (!this.isMobile() && isLocked) {
          isLocked = false;
          if (this.swiper) this.swiper.allowTouchMove = true;
          if (galleryColumn) galleryColumn.classList.remove(this.classes.galleryLocked);
          this.classList.remove(this.classes.contentExpanded);
          if (contentColumn) contentColumn.classList.remove(this.classes.contentLockedTop);
        }
      };

      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onResize, 120);
      }, { passive: true, signal });

      onResize();
    }

    initMediaObserver() {
      const videos = this.querySelectorAll(this.selectors.videos);
      if (!videos.length) return;

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = entry.target;
              if (entry.isIntersecting) {
                video.play().catch(() => {});
              } else {
                video.pause();
              }
            });
          },
          { threshold: 0.2 }
        );

        videos.forEach((video) => this.observer.observe(video));
      }
    }

    initZoomModal() {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      const zoomTriggers = this.querySelectorAll(this.selectors.zoomTriggers);
      const zoomCloseBtn = this.querySelector(this.selectors.zoomClose);
      const { signal } = this.abortController;

      if (!zoomModal) return;

      zoomTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          const index = trigger.getAttribute('data-media-index');
          this.openZoomModal(index);
        }, { signal });

        trigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const index = trigger.getAttribute('data-media-index');
            this.openZoomModal(index);
          }
        }, { signal });
      });

      if (zoomCloseBtn) {
        zoomCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeZoomModal();
        }, { signal });
      }

      window.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && this.isZoomOpen()) {
            this.closeZoomModal();
          }
        },
        { signal }
      );
    }

    openZoomModal(index) {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      if (!zoomModal) return;

      zoomModal.classList.add(this.classes.modalActive);
      zoomModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add(this.classes.scrollLocked);
      document.body.classList.add(this.classes.zoomModalActive);

      if (window.lazySizes && typeof window.lazySizes.loader.checkElems === 'function') {
        window.lazySizes.loader.checkElems();
      }

      const targetItem = zoomModal.querySelector('#pdp-zoom-item-' + index);
      if (targetItem) {
        setTimeout(() => {
          targetItem.scrollIntoView({ behavior: 'auto', block: 'start' });
          if (window.lazySizes && typeof window.lazySizes.loader.checkElems === 'function') {
            window.lazySizes.loader.checkElems();
          }
        }, 50);
      }
    }

    closeZoomModal() {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      if (!zoomModal) return;

      zoomModal.classList.remove(this.classes.modalActive);
      zoomModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove(this.classes.scrollLocked);
      document.body.classList.remove(this.classes.zoomModalActive);
    }

    isZoomOpen() {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      return zoomModal && zoomModal.classList.contains(this.classes.modalActive);
    }

    initDrawersMovement() {
      const drawers = this.querySelectorAll(this.selectors.moveDrawers);
      const rootDrawersContainer = document.querySelector(this.selectors.rootDrawers) || document.body;

      if (rootDrawersContainer && drawers.length) {
        drawers.forEach((drawer) => {
          if (drawer.parentElement !== rootDrawersContainer) {
            rootDrawersContainer.appendChild(drawer);
          }
        });
      }
    }

    disconnectedCallback() {
      this.destroySwiper();

      if (this.mql) {
        this.mql.removeEventListener('change', this.handleMediaChange);
      }

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }
  }

  customElements.define('product-fullscreen', ProductFullscreen);
}

if (!customElements.get('product-fullscreen-anchor')) {
  class ProductFullscreenAnchor extends HTMLElement {
    constructor() {
      super();
    }
  }

  customElements.define('product-fullscreen-anchor', ProductFullscreenAnchor);
}

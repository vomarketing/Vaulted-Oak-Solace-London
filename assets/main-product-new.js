/**
 * <product-fullscreen> Section Container Component
 */

if (!customElements.get('product-fullscreen')) {
  class ProductFullscreen extends HTMLElement {
    static selectors = {
      mediaGallery: '.js-pdp-media-gallery',
      mediaList: '.js-pdp-media-list',
      mediaItems: '.js-pdp-media-item',
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
      this.initMobileSwiper();
      this.initMobileScrollController();
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
      this.handleMediaChange = (e) => {
        if (e.matches) {
          this.destroyMobileSwiper();
        } else {
          this.initMobileSwiper();
        }
      };

      this.mql.addEventListener('change', this.handleMediaChange);
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

    initMobileSwiper() {
      if (!this.isMobile()) return;
      if (this.swiper) return;

      const swiperEl = this.querySelector(this.selectors.mediaGallery);
      if (!swiperEl) return;

      const slideCount = this.querySelectorAll(this.selectors.mediaItems).length;
      if (slideCount <= 1) return;

      const setupSwiper = () => {
        if (!window.Swiper) return;
        this.swiper = new window.Swiper(swiperEl, {
          direction: 'vertical',
          slidesPerView: 1,
          spaceBetween: 0,
          speed: 350,
          mousewheel: {
            releaseOnEdges: true,
            sensitivity: 1
          },
          touchReleaseOnEdges: true,
          resistanceRatio: 0.7,
          watchOverflow: true,
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
            onlyInViewport: true
          },
          on: {
            init: (swiper) => {
              this.handleSlideChange(swiper);
              this.updateHeaderContrast(swiper);
            },
            slideChangeTransitionStart: (swiper) => {
              this.handleSlideChange(swiper);
            },
            slideChangeTransitionEnd: (swiper) => {
              this.updateHeaderContrast(swiper);
            }
          }
        });
      };

      if (window.FullpageScrollController && typeof window.FullpageScrollController.awaitSwiper === 'function') {
        window.FullpageScrollController.awaitSwiper().then(setupSwiper);
      } else {
        if (window.Swiper) {
          setupSwiper();
        }
      }
    }

    handleSlideChange(swiper) {
      if (!swiper || !swiper.slides) return;
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const allVideos = this.querySelectorAll(this.selectors.videos);
      allVideos.forEach((video) => {
        if (video.closest('.swiper-slide') !== activeSlide) {
          video.pause();
        }
      });

      const activeVideo = activeSlide.querySelector(this.selectors.videos);
      if (activeVideo) {
        activeVideo.play().catch(() => {});
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

    destroyMobileSwiper() {
      if (this.swiperInitTimer) {
        clearTimeout(this.swiperInitTimer);
        this.swiperInitTimer = null;
      }
      if (this.swiper) {
        this.swiper.destroy(true, true);
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
        
        if (this.swiper) {
          this.swiper.allowTouchMove = false;
          // Force Swiper to instantly snap back to its correct position to avoid conflicting animations with window.scrollTo
          this.swiper.setTransition(0);
          if (this.swiper.snapGrid && this.swiper.snapGrid[this.swiper.activeIndex] !== undefined) {
            this.swiper.setTranslate(-this.swiper.snapGrid[this.swiper.activeIndex]);
          }
        }
        
        if (galleryColumn) galleryColumn.classList.add(this.classes.galleryLocked);
        this.classList.add(this.classes.contentExpanded);

        const headerHeight = 52; // Hardcode to 52px for transparent header UX
        const galleryHeight = galleryColumn ? galleryColumn.offsetHeight : 727;
        const targetScroll = Math.max(0, galleryHeight - headerHeight);

        if (animate) {
          window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
          
          // Delay locking the height/overflow until the smooth scroll completes
          // This prevents Safari from aggressively jumping when DOM height shrinks during a scroll animation
          setTimeout(() => {
            if (isLocked && contentColumn) {
              contentColumn.classList.add(this.classes.contentLockedTop);
            }
          }, 400);
        } else {
          contentColumn.classList.add(this.classes.contentLockedTop);
          window.scrollTo({
            top: targetScroll,
            behavior: 'instant'
          });
        }
      };

      const collapseSheet = (animate = true) => {
        if (!this.isMobile() || !contentColumn) return;
        isLocked = false;
        if (this.swiper) this.swiper.allowTouchMove = true;
        if (galleryColumn) galleryColumn.classList.remove(this.classes.galleryLocked);
        this.classList.remove(this.classes.contentExpanded);
        contentColumn.classList.remove(this.classes.contentLockedTop);
        contentColumn.scrollTop = 0;

        if (animate && window.scrollY > 0) {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
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

      const fromEditorialEvent = window.FullpageScrollController?.events?.fromEditorial || 'pdp:transition:from-editorial';
      document.addEventListener(fromEditorialEvent, () => {
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
      let isTouchActive = false;

      if (contentColumn) {
        contentColumn.addEventListener('touchstart', (e) => {
          if (!this.isMobile() || !e.touches.length) return;
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
          isTouchActive = true;

          const isLockedTop = contentColumn.classList.contains(this.classes.contentLockedTop);
          if (isLockedTop) {
            startedAtTop = contentColumn.scrollTop <= 2;
          } else {
            startedAtTop = false;
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
            // Re-read DOM dimensions on touchend to handle orientation change bugs
            const freshScrollHeight = contentColumn.scrollHeight;
            const freshClientHeight = contentColumn.clientHeight;
            const freshScrollTop = contentColumn.scrollTop;

            const maxScrollable = freshScrollHeight - freshClientHeight;
            const isAtBottomNow = maxScrollable > 5
              ? (freshScrollTop >= maxScrollable - 5)
              : true;

            if (startedAtTop && diffY < -45 && diffX < Math.abs(diffY) * 0.8) {
              collapseSheet(true);
              return;
            }

            const mobileSwipeThreshold = window.FullpageScrollController?.config?.mobileSwipeThreshold || 40;
            const sheetOverscrollEvent = window.FullpageScrollController?.events?.sheetBottomOverscroll || 'pdp:sheet:bottom-overscroll';

            if (isAtBottomNow && diffY > mobileSwipeThreshold && diffX < Math.abs(diffY) * 0.8) {
              const editorialContainer = document.querySelector('.pdp-editorial-swiper');
              if (!editorialContainer) return;

              document.dispatchEvent(new CustomEvent(sheetOverscrollEvent));
            }
          }
        }, { passive: true, signal });

        // iOS fires touchcancel (e.g. during fast scroll or system gesture) — must reset
        contentColumn.addEventListener('touchcancel', () => {
          isTouchActive = false;
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

      // Sync on window scroll
      const checkScrollState = () => {
        if (!this.isMobile()) {
          if (isLocked) {
            isLocked = false;
            if (this.swiper) this.swiper.allowTouchMove = true;
            if (galleryColumn) galleryColumn.classList.remove(this.classes.galleryLocked);
            this.classList.remove(this.classes.contentExpanded);
            if (contentColumn) contentColumn.classList.remove(this.classes.contentLockedTop);
          }
          return;
        }

        if (window.scrollY <= 0 && isLocked && contentColumn && contentColumn.scrollTop <= 0) {
          collapseSheet(false);
        }
      };

      window.addEventListener('scroll', checkScrollState, { passive: true, signal });
      window.addEventListener('resize', checkScrollState, { passive: true, signal });

      checkScrollState();
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
      this.destroyMobileSwiper();

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

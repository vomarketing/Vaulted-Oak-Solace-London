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

      init();
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

      const headerMode = activeSlide.getAttribute('data-header-mode');
      if (headerMode && window.headerContrastController && typeof window.headerContrastController.updateContrast === 'function') {
        window.headerContrastController.updateContrast(headerMode);
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
        if (this.swiper) this.swiper.allowTouchMove = false;
        if (galleryColumn) galleryColumn.classList.add(this.classes.galleryLocked);
        this.classList.add(this.classes.contentExpanded);
        contentColumn.classList.add(this.classes.contentLockedTop);

        const headerHeight = document.querySelector(this.selectors.header)?.offsetHeight || 60;
        const targetScroll = window.scrollY + contentColumn.getBoundingClientRect().top - headerHeight;
        if (animate && targetScroll > 0) {
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
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

      // SSENSE App touch gesture tracking on Content Column
      let touchStartY = 0;
      let isTouchActive = false;

      if (contentColumn) {
        contentColumn.addEventListener('touchstart', (e) => {
          if (!this.isMobile() || !e.touches.length) return;
          touchStartY = e.touches[0].clientY;
          isTouchActive = true;
        }, { passive: true, signal });

        contentColumn.addEventListener('touchmove', (e) => {
          if (!this.isMobile() || !isTouchActive || !e.touches.length) return;
          const currentY = e.touches[0].clientY;
          const diffY = touchStartY - currentY; // > 0 is swipe up, < 0 is swipe down

          const isLockedTop = contentColumn.classList.contains(this.classes.contentLockedTop);

          // 1. In Peek Mode: Swipe up -> Expand to Locked Top
          if (!isLockedTop && diffY > 25) {
            expandSheet(true);
            return;
          }

          // 2. In Expanded Locked Top Mode:
          if (isLockedTop) {
            const isAtTop = contentColumn.scrollTop <= 5;
            const isAtBottom = contentColumn.scrollTop + contentColumn.clientHeight >= contentColumn.scrollHeight - 25;

            // Swipe down when at top of content -> Collapse back to Peek Mode
            if (isAtTop && diffY < -35) {
              collapseSheet(true);
              isTouchActive = false;
              return;
            }

            // Swipe up when at bottom of content -> Transition to Next Section with Creative Effect
            if (isAtBottom && diffY > 30) {
              const pdpSection = this.closest('.shopify-section') || this;
              const editorialContainer = document.querySelector('.pdp-editorial-swiper');
              const pdpMain = this.querySelector('.pdp-new__main');
              const targetScroll = editorialContainer ? editorialContainer.offsetTop : (pdpSection.offsetTop + pdpSection.offsetHeight);

              // Apply creative transition: editorial slides up, pdp pushes back
              if (editorialContainer) {
                editorialContainer.classList.add('is-editorial-entering');
              }
              if (pdpMain) {
                pdpMain.classList.add('is-pdp-leaving');
              }

              // Force reflow, then trigger scroll
              requestAnimationFrame(() => {
                if (editorialContainer) editorialContainer.classList.remove('is-editorial-entering');

                window.scrollTo({
                  top: targetScroll,
                  behavior: 'smooth'
                });

                // Cleanup after animation
                setTimeout(() => {
                  if (pdpMain) pdpMain.classList.remove('is-pdp-leaving');
                }, 600);
              });

              isTouchActive = false;
              return;
            }
          }
        }, { passive: true, signal });

        contentColumn.addEventListener('touchend', () => {
          isTouchActive = false;
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

        const headerHeight = document.querySelector(this.selectors.header)?.offsetHeight || 60;
        if (window.scrollY <= 5 && isLocked && contentColumn && contentColumn.scrollTop <= 0) {
          collapseSheet(false);
        } else if (window.scrollY > 15 && !isLocked) {
          expandSheet(false);
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

      zoomModal.addEventListener('click', (e) => {
        if (
          e.target.closest(this.selectors.zoomClose) ||
          e.target.closest('.pdp-zoom-modal__item') ||
          e.target === zoomModal
        ) {
          this.closeZoomModal();
        }
      }, { signal });

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

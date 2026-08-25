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
      zoomTriggers: '.js-pdp-media-zoom-trigger',
      zoomModal: '.js-pdp-zoom-modal',
      zoomClose: '.js-pdp-zoom-close',
      zoomItems: '.js-pdp-zoom-item',
      priceContainer: '.pdp-content__price-row',
      stockStatus: '.js-pdp-stock-status',
      klaviyoData: '.js-pdp-klaviyo-data'
    };

    static classes = {
      modalActive: 'is-active',
      scrollLocked: 'is-scroll-locked'
    };

    constructor() {
      super();

      this.selectors = ProductFullscreen.selectors;
      this.classes = ProductFullscreen.classes;
      this.swiper = null;
    }

    connectedCallback() {
      this.abortController = new AbortController();

      this.initMediaObserver();
      this.initMobileSwiper();
      this.initZoomModal();
      this.initDrawersMovement();
      // this.initKlaviyoTracking();
      this.initBisPopover();

      this.addEventListener('variant:change', (e) => {
        const { price, comparePrice, inventoryQty } = e.detail;
        this.updateExternalPriceAndStock(price, comparePrice, inventoryQty);
      }, { signal: this.abortController.signal });

      this.mql = window.matchMedia('(max-width: 900px)');
      this.handleMediaChange = (e) => {
        if (e.matches) {
          this.initMobileSwiper();
        } else {
          this.destroyMobileSwiper();
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
      if (window.innerWidth > 900) return;
      if (this.swiper) return;

      const swiperEl = this.querySelector(this.selectors.swiper);
      if (!swiperEl) return;

      const slideCount = this.querySelectorAll(this.selectors.slides).length;
      if (slideCount <= 1) return;

      const init = () => {
        if (typeof window.Swiper === 'undefined') {
          setTimeout(init, 50);
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
      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = null;
      }
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

      if (!zoomModal) return;

      zoomTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          const index = trigger.getAttribute('data-media-index');
          this.openZoomModal(index);
        });

        trigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const index = trigger.getAttribute('data-media-index');
            this.openZoomModal(index);
          }
        });
      });

      zoomModal.addEventListener('click', (e) => {
        if (
          e.target.closest('.pdp-zoom-modal__close') ||
          e.target.closest('.pdp-zoom-modal__item') ||
          e.target === zoomModal
        ) {
          this.closeZoomModal();
        }
      });

      window.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && this.isZoomOpen()) {
            this.closeZoomModal();
          }
        },
        { signal: this.abortController.signal }
      );
    }

    openZoomModal(index) {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      if (!zoomModal) return;

      zoomModal.classList.add(this.classes.modalActive);
      zoomModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add(this.classes.scrollLocked);
      document.body.classList.add('is-zoom-modal-active');

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
      document.body.classList.remove('is-zoom-modal-active');
    }

    isZoomOpen() {
      const zoomModal = this.querySelector(this.selectors.zoomModal);
      return zoomModal && zoomModal.classList.contains(this.classes.modalActive);
    }

    initDrawersMovement() {
      const drawers = this.querySelectorAll('[data-module-drawers-move-me="root"]');
      const rootDrawersContainer = document.querySelector('.drw-Drawers[data-module="drawers"]') || document.body;

      if (rootDrawersContainer && drawers.length) {
        drawers.forEach((drawer) => {
          if (drawer.parentElement !== rootDrawersContainer) {
            rootDrawersContainer.appendChild(drawer);
          }
        });
      }
    }

    initKlaviyoTracking() {
      const dataEl = this.querySelector(this.selectors.klaviyoData);
      if (!dataEl) return;

      let klaviyoItem = null;
      try {
        klaviyoItem = JSON.parse(dataEl.textContent);
      } catch (e) {
        console.log('Klaviyo data parse error:', e);
        return;
      }

      if (!klaviyoItem) return;

      window._learnq = window._learnq || [];
      window._learnq.push(['track', 'Viewed Product', klaviyoItem]);
      window._learnq.push(['trackViewedItem', {
        Title: klaviyoItem.Name,
        ItemId: klaviyoItem.ProductID,
        Categories: klaviyoItem.Categories,
        ImageUrl: klaviyoItem.ImageURL,
        Url: klaviyoItem.URL,
        Metadata: {
          Brand: klaviyoItem.Brand,
          Price: klaviyoItem.Price,
          CompareAtPrice: klaviyoItem.CompareAtPrice
        }
      }]);

      const submitBtn = this.querySelector('.js-pdp-submit');
      if (submitBtn) {
        const { signal } = this.abortController;
        submitBtn.addEventListener('click', () => {
          window._learnq = window._learnq || [];
          window._learnq.push(['track', 'Added to Cart', klaviyoItem]);
        }, { signal });
      }
    }

    initBisPopover() {
      if (typeof window.BIS === 'undefined' || typeof window.BISPopover === 'undefined') {
        const checkBis = setInterval(() => {
          if (typeof window.BIS !== 'undefined' && typeof window.BISPopover !== 'undefined') {
            clearInterval(checkBis);
            this.setupBisPopover();
          }
        }, 300);
        setTimeout(() => clearInterval(checkBis), 5000);
        return;
      }

      this.setupBisPopover();
    }

    setupBisPopover() {
      if (!window.BIS || !window.BISPopover) return;
      if (window.BIS.urlIsProductPage && !window.BIS.urlIsProductPage()) return;

      window.BISPopover.ready.then(() => {
        const masterSelect = this.querySelector('.js-pdp-master-select');
        if (!masterSelect) return;

        const reload = () => {
          try {
            const variant = window.BIS.detectVariant(window.BIS.popup);
            if (variant && window.BIS.popup.variantIsUnavailable(variant)) {
            }
          } catch (e) {
            console.log('BIS error:', e);
          }
        };

        const { signal } = this.abortController;
        masterSelect.addEventListener('change', reload, { signal });
      });
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

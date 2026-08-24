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

      // Size & Form Selectors
      sizeButtons: '.js-pdp-size-btn',
      optionSelects: '.js-pdp-option-select',
      masterSelect: '.js-pdp-master-select',
      submitButton: '.js-pdp-submit',
      submitText: '.js-pdp-submit-text',
      submitChoose: '.js-pdp-submit-choose',
      priceButtonPrice: '[data-product-detail-button-price]',
      priceContainer: '.pdp-content__price-row',
      stockStatus: '.js-pdp-stock-status',

      // Wishlist
      wishlistAddBtn: '.js-Wishlist_Button-add',

      // Drawers
      sizeGuideTrigger: '.js-size-guide-trigger',

      // Tracking & Third Party
      klaviyoData: '.js-pdp-klaviyo-data'
    };

    static classes = {
      modalActive: 'is-active',
      btnSelected: 'is-selected',
      isHidden: 'is-hidden',
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
      this.initVariantSelection();
      this.initDrawersMovement();
      this.initKlaviyoTracking();
      this.initBisPopover();

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

    initVariantSelection() {
      const sizeButtons = this.querySelectorAll(this.selectors.sizeButtons);
      const masterSelect = this.querySelector(this.selectors.masterSelect);
      const submitBtn = this.querySelector(this.selectors.submitButton);
      const submitText = this.querySelector(this.selectors.submitText);
      const priceContainer = this.querySelector(this.selectors.priceContainer);
      const buttonPrices = this.querySelectorAll(this.selectors.priceButtonPrice);
      const stockStatus = this.querySelector(this.selectors.stockStatus);
      const optionDropdowns = this.querySelectorAll(this.selectors.optionSelects);

      // Handle non-size dropdown options (e.g. Gift Cards)
      optionDropdowns.forEach((dropdown) => {
        dropdown.addEventListener('change', () => {
          this.dataset.sizeChosen = 'true';
          const selectedVal = dropdown.value;
          if (masterSelect) {
            for (let i = 0; i < masterSelect.options.length; i++) {
              if (masterSelect.options[i].text.trim() === selectedVal.trim()) {
                masterSelect.value = masterSelect.options[i].value;
                masterSelect.dispatchEvent(new Event('change', { bubbles: true }));
                this.updateVariantState(masterSelect.options[i]);
                break;
              }
            }
          }
        });
      });

      if (!sizeButtons.length && !masterSelect) return;

      sizeButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();

          this.dataset.sizeChosen = 'true';

          sizeButtons.forEach((btn) => {
            btn.classList.remove(this.classes.btnSelected);
            btn.setAttribute('aria-current', 'false');
          });

          button.classList.add(this.classes.btnSelected);
          button.setAttribute('aria-current', 'true');

          const sizeValue = button.getAttribute('data-value');
          const optionIndex = button.getAttribute('data-index');

          const hiddenSelect = this.querySelector(`select[data-index="${optionIndex}"]`);
          if (hiddenSelect) {
            hiddenSelect.value = sizeValue;
            hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const variantId = button.getAttribute('data-variant-id');
          let matchedVariantOption = null;

          if (variantId && masterSelect) {
            for (let i = 0; i < masterSelect.options.length; i++) {
              if (masterSelect.options[i].value === variantId) {
                matchedVariantOption = masterSelect.options[i];
                break;
              }
            }
          }

          if (!matchedVariantOption && masterSelect) {
            for (let i = 0; i < masterSelect.options.length; i++) {
              if (masterSelect.options[i].text === sizeValue) {
                matchedVariantOption = masterSelect.options[i];
                break;
              }
            }
          }

          if (matchedVariantOption) {
            masterSelect.value = matchedVariantOption.value;
            masterSelect.dispatchEvent(new Event('change', { bubbles: true }));
            this.updateVariantState(matchedVariantOption);
          }
        });
      });
    }

    updateVariantState(variantOption) {
      const isAvailable = variantOption.getAttribute('data-available') === 'true';
      const price = variantOption.getAttribute('data-price');
      const priceNoDecimals = variantOption.getAttribute('data-price-no-decimals') || price;
      const comparePrice = variantOption.getAttribute('data-compare-price');
      const inventoryQty = parseInt(variantOption.getAttribute('data-stock') || '0', 10);
      const variantId = variantOption.value;

      const submitBtn = this.querySelector(this.selectors.submitButton);
      const submitText = this.querySelector(this.selectors.submitText);
      const buttonPrices = this.querySelectorAll(this.selectors.priceButtonPrice);
      const priceContainer = this.querySelector(this.selectors.priceContainer);
      const stockStatus = this.querySelector(this.selectors.stockStatus);

      // Update Submit Button State
      if (submitBtn) {
        submitBtn.disabled = !isAvailable;
        if (isAvailable) {
          submitBtn.removeAttribute('data-module-drawers-trigger');
        } else {
          submitBtn.setAttribute('data-module-drawers-trigger', 'bis');
        }
      }

      if (submitText) {
        const addText = submitText.getAttribute('data-translation-add-to-cart') || 'Add To Bag';
        const soldOutText = submitText.getAttribute('data-translation-sold-out') || 'Sold Out';
        submitText.textContent = isAvailable ? addText : soldOutText;
      }

      // Update Embedded Button Price
      if (buttonPrices.length) {
        buttonPrices.forEach((priceEl) => {
          if (comparePrice && comparePrice !== price) {
            priceEl.innerHTML = `
              <s class="prd-Price_Compare text-reg-14">${comparePrice}</s>
              <span class="prd-Card_Kicker-red text-med-14">${priceNoDecimals}</span>
            `;
          } else {
            priceEl.innerHTML = priceNoDecimals;
          }
        });
      }

      // Update Standalone Price Row if present
      if (priceContainer && price) {
        if (comparePrice && comparePrice !== price) {
          const compNum = parseFloat(comparePrice.replace(/[^0-9.]/g, ''));
          const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
          const discount = compNum > priceNum ? Math.round(((compNum - priceNum) / compNum) * 100) : 0;
          const discountHtml = discount > 0 ? `<span class="pdp-content__price-discount prd-Card_Kicker-red text-reg-14">${discount}% off</span>` : '';
          priceContainer.innerHTML = `
            <s class="pdp-content__price-compare prd-Price_Compare text-reg-14">${comparePrice}</s>
            <span class="pdp-content__price-sale prd-Card_Kicker-red text-med-14">${price}</span>
            ${discountHtml}
          `;
        } else {
          priceContainer.innerHTML = `<span class="pdp-content__price-regular text-med-14">${price}</span>`;
        }
      }

      // Update Inventory Stock Status Notice (< 10)
      if (stockStatus) {
        if (inventoryQty > 0 && inventoryQty < 10) {
          stockStatus.setAttribute('aria-hidden', 'false');
        } else {
          stockStatus.setAttribute('aria-hidden', 'true');
        }
      }

      // Update Wishlist Variant IDs
      const wishlistAdd = document.querySelector(this.selectors.wishlistAddBtn);
      if (wishlistAdd) {
        wishlistAdd.dataset.variant = variantId;
        const productId = wishlistAdd.dataset.product ? parseInt(wishlistAdd.dataset.product) : null;
        if (window.iWishlistmain && productId && window.iWishlistmain[productId]) {
          if (window.iWishlistmain[productId].includes(String(variantId))) {
            wishlistAdd.classList.add('iwishAdded');
          } else {
            wishlistAdd.classList.remove('iwishAdded');
          }
        }
      }

      // Update Back In Stock Trigger
      const bisTrigger = document.querySelector('[data-el="back-in-stock.trigger"]');
      if (bisTrigger) {
        bisTrigger.dataset.variantId = variantId;
      }

      // Update URL State
      if (window.history && window.history.replaceState) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('variant', variantId);
        window.history.replaceState({ path: currentUrl.toString() }, '', currentUrl.toString());
      }
    }

    initDrawersMovement() {
      // Ensure drawers with data-module-drawers-move-me="root" are appended to root drawers container
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

      const submitBtn = this.querySelector(this.selectors.submitButton);
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
        const masterSelect = this.querySelector(this.selectors.masterSelect);
        if (!masterSelect) return;

        const reload = () => {
          try {
            const variant = window.BIS.detectVariant(window.BIS.popup);
            if (variant && window.BIS.popup.variantIsUnavailable(variant)) {
              // Reload unavailable variant
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

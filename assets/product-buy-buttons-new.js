/**
 * <product-buy-buttons> Custom Web Component
 */

if (!customElements.get('product-buy-buttons')) {
  class ProductBuyButtons extends HTMLElement {
    static selectors = {
      sizeButtons: '.js-pdp-size-btn',
      optionSelects: '.js-pdp-option-select',
      masterSelect: '.js-pdp-master-select',
      submitButton: '.js-pdp-submit',
      submitText: '.js-pdp-submit-text',
      sizeDrawer: '.js-pdp-size-drawer',
      sizeDrawerBackdrop: '.js-pdp-size-drawer-backdrop',
      bisBox: '.js-pdp-bis-box',
      bisEmail: '.js-pdp-bis-email',
      bisSubmit: '.js-pdp-bis-submit',
      bisResponse: '.js-pdp-bis-response',
      wishlistAddBtn: '.js-Wishlist_Button-add'
    };

    static classes = {
      btnSelected: 'is-selected',
      btnOos: 'pdp-size-row__btn--oos',
      drawerOpen: 'is-open',
      drawerExpanded: 'is-expanded',
      waitlistMode: 'is-waitlist-mode',
      backdropActive: 'is-active'
    };

    constructor() {
      super();
      this.selectors = ProductBuyButtons.selectors;
      this.classes = ProductBuyButtons.classes;
    }

    isDesktop() {
      return window.matchMedia('(min-width: 901px)').matches;
    }

    isMobile() {
      return !this.isDesktop();
    }

    connectedCallback() {
      this.abortController = new AbortController();

      this.initSizeDrawer();
      this.initVariantSelection();
      this.initBisForm();
      this.initWishlist();
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
      }
      if (this.wishlistObserver) {
        this.wishlistObserver.disconnect();
      }
      if (this.sectionObserver) {
        this.sectionObserver.disconnect();
      }
    }

    initSizeDrawer() {
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      const { signal } = this.abortController;

      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          e.preventDefault();
          this.collapseSizeDrawer(true);
        }, { signal });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isMobile() && this.isSizeDrawerOpen()) {
          this.collapseSizeDrawer(true);
        }
      }, { signal });

      document.addEventListener('click', (e) => {
        if (!this.isMobile()) return;

        const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
        const submitBtn = this.querySelector(this.selectors.submitButton);
        const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);

        if (this.isSizeDrawerOpen() && sizeDrawer && !sizeDrawer.contains(e.target)) {
          if (submitBtn && submitBtn.contains(e.target)) return;
          if (backdrop && backdrop.contains(e.target)) return;

          if (e.target.closest('.drw-Drawer') || e.target.closest('.js-Drawers_Backdrop') || e.target.closest('.drw-Drawers_Backdrop')) return;
          if (e.target.closest('[data-module-drawers-trigger]')) return;

          this.collapseSizeDrawer(true);
        }
      }, { signal });

      const pdpSection = this.closest('.pdp-new') || this.closest('.shopify-section');
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);

      if (pdpSection && sizeDrawer && 'IntersectionObserver' in window) {
        this.sectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!this.isMobile()) return;
            if (entry.isIntersecting) {
              sizeDrawer.classList.remove('is-hidden-by-section');
            } else {
              sizeDrawer.classList.add('is-hidden-by-section');
              this.collapseSizeDrawer(false);
            }
          });
        }, {
          threshold: 0.05
        });
        this.sectionObserver.observe(pdpSection);
      }

      document.addEventListener('pdp:transition:to-editorial', () => {
        if (!this.isMobile() || !sizeDrawer) return;
        sizeDrawer.classList.add('is-hidden-by-section');
        this.collapseSizeDrawer(false);
      }, { signal });

      document.addEventListener('pdp:transition:from-editorial', () => {
        if (!this.isMobile() || !sizeDrawer) return;
        sizeDrawer.classList.remove('is-hidden-by-section');
      }, { signal });
    }

    openSizeDrawer() {
      this.expandSizeDrawer();
    }

    closeSizeDrawer() {
      this.collapseSizeDrawer(true);
    }

    expandSizeDrawer() {
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      const bisBox = this.querySelector(this.selectors.bisBox);

      if (sizeDrawer) {
        sizeDrawer.classList.remove(this.classes.waitlistMode);
        sizeDrawer.classList.add(this.classes.drawerExpanded, this.classes.drawerOpen);
        sizeDrawer.setAttribute('aria-expanded', 'true');
      }
      if (backdrop) {
        backdrop.classList.add(this.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'false');
      }
      if (bisBox) {
        bisBox.classList.remove('is-active');
        bisBox.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.add('is-size-drawer-open');

      this.dispatchEvent(new CustomEvent('size-drawer:open', {
        bubbles: true,
        detail: { target: this }
      }));
    }

    collapseSizeDrawer(resetSelection = false) {
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      const bisBox = this.querySelector(this.selectors.bisBox);
      const bisResponse = this.querySelector(this.selectors.bisResponse);

      if (sizeDrawer) {
        sizeDrawer.classList.remove(this.classes.drawerExpanded, this.classes.drawerOpen, this.classes.waitlistMode);
        sizeDrawer.setAttribute('aria-expanded', 'false');
      }
      if (backdrop) {
        backdrop.classList.remove(this.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'true');
      }
      if (bisBox) {
        bisBox.classList.remove('is-active');
        bisBox.setAttribute('aria-hidden', 'true');
      }
      if (bisResponse) {
        bisResponse.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('is-size-drawer-open');

      if (resetSelection) {
        const submitText = this.querySelector(this.selectors.submitText);
        if (submitText) {
          submitText.textContent = submitText.getAttribute('data-translation-add-to-cart') || 'Add To Bag';
        }
        if (this.dataset.hasSizeOption === 'true') {
          this.dataset.sizeChosen = 'false';
        }
        const sizeButtons = this.querySelectorAll(this.selectors.sizeButtons);
        sizeButtons.forEach((btn) => {
          btn.classList.remove(this.classes.btnSelected);
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-current', 'false');
        });

        this.dispatchEvent(new CustomEvent('waitlist:mode-change', {
          bubbles: true,
          detail: { isWaitlistMode: false }
        }));
      }

      this.dispatchEvent(new CustomEvent('size-drawer:close', {
        bubbles: true,
        detail: { target: this }
      }));
    }

    isSizeDrawerExpanded() {
      if (!this.isMobile()) return false;
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      return sizeDrawer && (
        sizeDrawer.classList.contains(this.classes.drawerExpanded) ||
        sizeDrawer.classList.contains(this.classes.drawerOpen) ||
        sizeDrawer.classList.contains(this.classes.waitlistMode)
      );
    }

    isSizeDrawerOpen() {
      return this.isSizeDrawerExpanded();
    }

    initVariantSelection() {
      const sizeButtons = this.querySelectorAll(this.selectors.sizeButtons);
      const masterSelect = this.querySelector(this.selectors.masterSelect);
      const submitBtn = this.querySelector(this.selectors.submitButton);
      const optionDropdowns = this.querySelectorAll(this.selectors.optionSelects);
      const { signal } = this.abortController;

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
        }, { signal });
      });

      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          const isMobile = this.isMobile();
          const hasSizeOption = this.dataset.hasSizeOption === 'true';
          const sizeChosen = this.dataset.sizeChosen === 'true';

          if (isMobile && hasSizeOption) {
            if (!sizeChosen) {
              e.preventDefault();
              if (!this.isSizeDrawerExpanded()) {
                this.expandSizeDrawer();
              } else {
                const sizeRow = this.querySelector('.pdp-size-row');
                if (sizeRow) {
                  sizeRow.classList.add('is-highlight');
                  setTimeout(() => sizeRow.classList.remove('is-highlight'), 1000);
                }
              }
              return;
            }
          }

          if (masterSelect) {
            const selectedOption = masterSelect.options[masterSelect.selectedIndex];
            if (selectedOption && selectedOption.getAttribute('data-available') === 'false') {
              e.preventDefault();
              const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
              const bisBox = this.querySelector(this.selectors.bisBox);
              const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
              const emailInput = this.querySelector(this.selectors.bisEmail);

              if (isMobile) {
                if (sizeDrawer && !sizeDrawer.classList.contains(this.classes.waitlistMode)) {
                  sizeDrawer.classList.add(this.classes.waitlistMode, this.classes.drawerOpen, this.classes.drawerExpanded);
                  sizeDrawer.setAttribute('aria-expanded', 'true');
                  if (backdrop) {
                    backdrop.classList.add(this.classes.backdropActive);
                    backdrop.setAttribute('aria-hidden', 'false');
                  }
                  document.body.classList.add('is-size-drawer-open');

                  if (bisBox) {
                    bisBox.classList.add('is-active');
                    bisBox.setAttribute('aria-hidden', 'false');
                  }

                  this.dispatchEvent(new CustomEvent('waitlist:mode-change', {
                    bubbles: true,
                    detail: { isWaitlistMode: true }
                  }));

                  if (emailInput) {
                    setTimeout(() => emailInput.focus(), 250);
                  }
                  return;
                }
              } else {
                if (bisBox && (bisBox.getAttribute('aria-hidden') === 'true' || !bisBox.classList.contains('is-active'))) {
                  bisBox.classList.add('is-active');
                  bisBox.setAttribute('aria-hidden', 'false');
                  if (emailInput) {
                    setTimeout(() => emailInput.focus(), 150);
                  }
                  return;
                }
              }

              const emailInputEl = this.querySelector(this.selectors.bisEmail);
              if (emailInputEl && !emailInputEl.value.trim()) {
                emailInputEl.focus();
                emailInputEl.parentElement?.classList.add('is-highlight');
                setTimeout(() => emailInputEl.parentElement?.classList.remove('is-highlight'), 1200);
              } else {
                this.handleBisSubmission();
              }
            }
          }
        }, { signal });
      }

      if (!sizeButtons.length && !masterSelect) return;

      sizeButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const isMobile = this.isMobile();

          this.dataset.sizeChosen = 'true';

          sizeButtons.forEach((btn) => {
            btn.classList.remove(this.classes.btnSelected);
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-current', 'false');
          });

          button.classList.add(this.classes.btnSelected);
          button.setAttribute('aria-pressed', 'true');
          button.setAttribute('aria-current', 'true');

          const sizeValue = button.getAttribute('data-value');
          const optionIndex = button.getAttribute('data-index');

          const hiddenSelect = this.querySelector(`select[data-index="${optionIndex}"]`);
          if (hiddenSelect) {
            hiddenSelect.value = sizeValue;
            hiddenSelect.dispatchEvent(new Event('change'));
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

            const isAvailable = matchedVariantOption.getAttribute('data-available') === 'true';

            if (isMobile) {
              if (isAvailable) {
                this.collapseSizeDrawer(false);
                this.dataset.sizeChosen = 'false';
                const form = this.closest('form') || document.getElementById(`product-form-${this.dataset.sectionId}`);
                if (form) {
                  if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit(submitBtn);
                  } else {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                  }
                }
              } else {
                const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
                const bisBox = this.querySelector(this.selectors.bisBox);
                const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
                const emailInput = this.querySelector(this.selectors.bisEmail);

                if (sizeDrawer) {
                  sizeDrawer.classList.add(this.classes.waitlistMode, this.classes.drawerOpen, this.classes.drawerExpanded);
                  sizeDrawer.setAttribute('aria-expanded', 'true');
                }
                if (backdrop) {
                  backdrop.classList.add(this.classes.backdropActive);
                  backdrop.setAttribute('aria-hidden', 'false');
                }
                document.body.classList.add('is-size-drawer-open');

                if (bisBox) {
                  bisBox.classList.add('is-active');
                  bisBox.setAttribute('aria-hidden', 'false');
                }

                this.dispatchEvent(new CustomEvent('waitlist:mode-change', {
                  bubbles: true,
                  detail: { isWaitlistMode: true }
                }));

                if (emailInput) {
                  setTimeout(() => emailInput.focus(), 250);
                }
              }
            }
          }
        }, { signal });
      });
    }

    initBisForm() {
      const bisSubmit = this.querySelector(this.selectors.bisSubmit);
      const bisEmail = this.querySelector(this.selectors.bisEmail);
      const { signal } = this.abortController;

      if (bisSubmit) {
        bisSubmit.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleBisSubmission();
        }, { signal });
      }

      if (bisEmail) {
        bisEmail.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handleBisSubmission();
          }
        }, { signal });
      }
    }

    async handleBisSubmission() {
      const emailInput = this.querySelector(this.selectors.bisEmail);
      const responseEl = this.querySelector(this.selectors.bisResponse);
      const bisSubmit = this.querySelector(this.selectors.bisSubmit);
      const masterSelect = this.querySelector(this.selectors.masterSelect);

      if (!emailInput || !responseEl) return;

      const email = emailInput.value.trim();
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      const invalidEmailMsg = responseEl.getAttribute('data-invalid-email') || 'Please enter a valid email address.';

      if (!email || !emailRegex.test(email)) {
        responseEl.innerHTML = invalidEmailMsg;
        responseEl.className = 'pdp-bis-box__response text-reg-14 is-error js-pdp-bis-response';
        responseEl.setAttribute('aria-hidden', 'false');
        emailInput.focus();
        return;
      }

      const variantId = bisSubmit ? bisSubmit.getAttribute('data-variant-id') : (masterSelect ? masterSelect.value : '');
      const productId = bisSubmit ? bisSubmit.getAttribute('data-product-id') : (this.getAttribute('data-product-id') || this.dataset.productId || '');

      const successMsg = responseEl.getAttribute('data-success') || 'Thank you for joining the waitlist.<br>We’ll notify you if this size becomes available.';
      const errorMsg = responseEl.getAttribute('data-error') || 'Something went wrong. Please try again.';

      if (bisSubmit) {
        bisSubmit.disabled = true;
        bisSubmit.textContent = 'Sending...';
      }

      const onComplete = (isOk, msg) => {
        if (bisSubmit) {
          bisSubmit.disabled = false;
          bisSubmit.textContent = 'Submit';
        }
        if (isOk) {
          responseEl.innerHTML = msg || successMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-success js-pdp-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
          emailInput.value = '';
        } else {
          responseEl.innerHTML = msg || errorMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-error js-pdp-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
        }
      };

      // Try legacy Back In Stock app if available
      if (window.BIS && typeof window.BIS.create === 'function') {
        try {
          const res = await window.BIS.create(email, variantId, productId);
          if (res && (res.status === 'OK' || res.status === 'ok' || res.status === 200)) {
            onComplete(true, res.message || successMsg);
            return;
          } else {
            const err = res && res.errors ? (Array.isArray(res.errors) ? res.errors.join(' ') : Object.values(res.errors).flat().join(' ')) : errorMsg;
            onComplete(false, err || errorMsg);
            return;
          }
        } catch (e) {
          console.warn('[BIS] window.BIS.create failed:', e);
          onComplete(false, errorMsg);
          return;
        }
      }

      // Submit to Klaviyo Back In Stock modern Client API
      try {
        const companyId = this.getAttribute('data-klaviyo-account') || window._learnq?.accountNum || (window.location.hostname.includes('solace-london') ? 'XuEqtQ' : 'MKZsDF');

        if (window._learnq && typeof window._learnq.push === 'function') {
          window._learnq.push(['identify', { '$email': email }]);
          window._learnq.push(['track', 'Subscribed to Back in Stock', {
            email: email,
            variant: variantId,
            variant_id: variantId,
            product_id: productId,
            VariantID: variantId,
            ProductID: productId
          }]);
        }

        const compoundVariantId = `$shopify:::$default:::${variantId}`;

        const klaviyoPayload = {
          data: {
            type: 'back-in-stock-subscription',
            attributes: {
              channels: ['EMAIL'],
              profile: {
                data: {
                  type: 'profile',
                  attributes: {
                    email: email
                  }
                }
              }
            },
            relationships: {
              variant: {
                data: {
                  type: 'catalog-variant',
                  id: compoundVariantId
                }
              }
            }
          }
        };

        const klaviyoRes = await fetch(`https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=${encodeURIComponent(companyId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.api+json',
            'revision': '2026-07-15'
          },
          body: JSON.stringify(klaviyoPayload)
        });

        console.log(klaviyoRes, 'error')

        if (klaviyoRes.ok || klaviyoRes.status === 200 || klaviyoRes.status === 201 || klaviyoRes.status === 202 || klaviyoRes.status === 409) {
          onComplete(true, successMsg);
        } else if (klaviyoRes.status === 429) {
          onComplete(false, 'Too many requests. Please wait a moment and try again.');
        } else {
          let errMsg = errorMsg;
          try {
            const errData = await klaviyoRes.json();
            if (errData && Array.isArray(errData.errors) && errData.errors.length) {
              const detail = errData.errors.map(e => e.detail || e.title || '').filter(Boolean).join(' ');
              if (detail) {
                errMsg = detail;
              }
            } else if (errData && errData.message) {
              errMsg = errData.message;
            }
          } catch (e) {}

          onComplete(false, errMsg);
        }
      } catch (err) {
        console.error('[BIS] Submission error:', err);
        onComplete(false, errorMsg);
      }
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
      const bisBox = this.querySelector(this.selectors.bisBox);
      const bisSubmit = this.querySelector(this.selectors.bisSubmit);
      const bisResponse = this.querySelector(this.selectors.bisResponse);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('data-module-drawers-trigger');
      }

      if (submitText) {
        const addText = submitText.getAttribute('data-translation-add-to-cart') || 'Add To Bag';
        const waitlistText = submitText.getAttribute('data-translation-waitlist') || 'Join The Waitlist';
        submitText.textContent = isAvailable ? addText : waitlistText;
      }

      if (bisBox) {
        bisBox.classList.remove('is-active');
        bisBox.setAttribute('aria-hidden', 'true');
        if (bisResponse) bisResponse.setAttribute('aria-hidden', 'true');

        if (!isAvailable) {
          if (bisSubmit) bisSubmit.setAttribute('data-variant-id', variantId);
          const bisTrigger = this.querySelector('[data-el="back-in-stock.trigger"]');
          if (bisTrigger) bisTrigger.setAttribute('data-variant-id', variantId);
        } else {
          const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
          if (sizeDrawer) sizeDrawer.classList.remove(this.classes.waitlistMode);
        }
      }

      const wishlistAdd = this.querySelector(this.selectors.wishlistAddBtn);
      if (wishlistAdd) {
        wishlistAdd.dataset.variant = variantId;
        wishlistAdd.setAttribute('data-variant', variantId);
        const productId = wishlistAdd.getAttribute('data-product') || this.getAttribute('data-product-id');
        if (productId) {
          wishlistAdd.setAttribute('data-product', productId);
        }
        if (window.iWishlistmain && productId && window.iWishlistmain[productId]) {
          if (window.iWishlistmain[productId].includes(String(variantId))) {
            wishlistAdd.classList.add('iwishAdded', 'is-added', 'pdp-cta-wishlist__btn--active');
          } else {
            wishlistAdd.classList.remove('iwishAdded', 'is-added', 'pdp-cta-wishlist__btn--active');
          }
        }
      }

      const bisTrigger = document.querySelector('[data-el="back-in-stock.trigger"]');
      if (bisTrigger) {
        bisTrigger.dataset.variantId = variantId;
      }

      if (window.history && window.history.replaceState) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('variant', variantId);
        window.history.replaceState({ path: currentUrl.toString() }, '', currentUrl.toString());
      }

      this.dispatchEvent(new CustomEvent('variant:change', {
        bubbles: true,
        detail: {
          variantId,
          isAvailable,
          price,
          priceNoDecimals,
          comparePrice,
          inventoryQty
        }
      }));
    }

    initWishlist() {
      const wishlistBtn = this.querySelector(this.selectors.wishlistAddBtn);
      if (!wishlistBtn) return;
      const { signal } = this.abortController;

      const iconsContainer = wishlistBtn.querySelector('.pdp-cta-wishlist__icons');
      const originalIconsHtml = iconsContainer ? iconsContainer.innerHTML : wishlistBtn.innerHTML;

      this.wishlistObserver = new MutationObserver(() => {
        const currentIcons = wishlistBtn.querySelector('.pdp-cta-wishlist__icons');
        if (!currentIcons || !currentIcons.querySelector('svg')) {
          wishlistBtn.innerHTML = `
            <span class="pdp-cta-wishlist__icons">
              ${originalIconsHtml}
            </span>
          `;
        }
      });
      this.wishlistObserver.observe(wishlistBtn, { childList: true });

      wishlistBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const masterSelect = this.querySelector(this.selectors.masterSelect);
        const variantId = wishlistBtn.getAttribute('data-variant') || (masterSelect ? masterSelect.value : '');
        const productId = wishlistBtn.getAttribute('data-product') || this.getAttribute('data-product-id') || '';

        wishlistBtn.setAttribute('data-variant', variantId);
        wishlistBtn.setAttribute('data-product', productId);

        const isCurrentlyAdded = wishlistBtn.classList.contains('is-added') || wishlistBtn.classList.contains('iwishAdded') || wishlistBtn.classList.contains('pdp-cta-wishlist__btn--active');

        if (isCurrentlyAdded) {
          wishlistBtn.classList.remove('is-added', 'iwishAdded', 'pdp-cta-wishlist__btn--active');
          if (window.wishlist && typeof window.wishlist.removeFromWishlist === 'function') {
            window.wishlist.removeFromWishlist(wishlistBtn, variantId, false);
          }
        } else {
          wishlistBtn.classList.add('is-added', 'iwishAdded', 'pdp-cta-wishlist__btn--active');
          if (window.wishlist && typeof window.wishlist.addToWishlist === 'function') {
            window.wishlist.addToWishlist(wishlistBtn, variantId, false);
          }
        }
      }, { signal });
    }
  }

  customElements.define('product-buy-buttons', ProductBuyButtons);
}

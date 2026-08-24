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
      sizeDrawerClose: '.js-pdp-size-drawer-close',
      bisBox: '.js-pdp-bis-box',
      bisEmail: '.js-pdp-bis-email',
      bisSubmit: '.js-pdp-bis-submit',
      bisResponse: '.js-pdp-bis-response',
      wishlistAddBtn: '.js-Wishlist_Button-add'
    };

    static classes = {
      btnSelected: 'is-selected',
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
    }

    initSizeDrawer() {
      const closeBtn = this.querySelector(this.selectors.sizeDrawerClose);
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      const { signal } = this.abortController;

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.collapseSizeDrawer();
        }, { signal });
      }

      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          e.preventDefault();
          this.collapseSizeDrawer();
        }, { signal });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isSizeDrawerOpen()) {
          this.collapseSizeDrawer();
        }
      }, { signal });
    }

    openSizeDrawer() {
      this.expandSizeDrawer();
    }

    closeSizeDrawer() {
      this.collapseSizeDrawer();
    }

    expandSizeDrawer() {
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      if (sizeDrawer) {
        sizeDrawer.classList.add(this.classes.drawerExpanded, this.classes.drawerOpen);
        sizeDrawer.setAttribute('aria-expanded', 'true');
      }
      if (backdrop) {
        backdrop.classList.add(this.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'false');
      }
      document.body.classList.add('is-size-drawer-open');

      this.dispatchEvent(new CustomEvent('size-drawer:open', {
        bubbles: true,
        detail: { target: this }
      }));
    }

    collapseSizeDrawer() {
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      const backdrop = this.querySelector(this.selectors.sizeDrawerBackdrop);
      if (sizeDrawer) {
        sizeDrawer.classList.remove(this.classes.drawerExpanded, this.classes.drawerOpen, this.classes.waitlistMode);
        sizeDrawer.setAttribute('aria-expanded', 'false');
      }
      if (backdrop) {
        backdrop.classList.remove(this.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('is-size-drawer-open');

      this.dispatchEvent(new CustomEvent('size-drawer:close', {
        bubbles: true,
        detail: { target: this }
      }));
    }

    isSizeDrawerExpanded() {
      if (window.innerWidth > 900) return true;
      const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
      return sizeDrawer && (sizeDrawer.classList.contains(this.classes.drawerExpanded) || sizeDrawer.classList.contains(this.classes.drawerOpen));
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
          const isMobile = window.innerWidth <= 900;
          const hasSizeOption = this.dataset.hasSizeOption === 'true';
          const sizeChosen = this.dataset.sizeChosen === 'true';

          if (isMobile && hasSizeOption) {
            if (!this.isSizeDrawerExpanded()) {
              e.preventDefault();
              this.expandSizeDrawer();
              return;
            }

            if (!sizeChosen) {
              e.preventDefault();
              const sizeRow = this.querySelector('.pdp-size-row');
              if (sizeRow) {
                sizeRow.classList.add('is-highlight');
                setTimeout(() => sizeRow.classList.remove('is-highlight'), 1000);
              }
              return;
            }
          }

          if (masterSelect) {
            const selectedOption = masterSelect.options[masterSelect.selectedIndex];
            if (selectedOption && selectedOption.getAttribute('data-available') === 'false') {
              e.preventDefault();
              const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);

              if (isMobile && sizeDrawer && !sizeDrawer.classList.contains(this.classes.waitlistMode)) {
                sizeDrawer.classList.add(this.classes.waitlistMode);
                this.dispatchEvent(new CustomEvent('waitlist:mode-change', {
                  bubbles: true,
                  detail: { isWaitlistMode: true }
                }));

                const emailInput = this.querySelector(this.selectors.bisEmail);
                if (emailInput) {
                  setTimeout(() => emailInput.focus(), 250);
                }
                return;
              }

              const emailInput = this.querySelector(this.selectors.bisEmail);
              if (emailInput && !emailInput.value.trim()) {
                emailInput.focus();
                emailInput.parentElement?.classList.add('is-highlight');
                setTimeout(() => emailInput.parentElement?.classList.remove('is-highlight'), 1200);
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

          this.dataset.sizeChosen = 'true';

          const sizeDrawer = this.querySelector(this.selectors.sizeDrawer);
          if (sizeDrawer) {
            sizeDrawer.classList.remove(this.classes.waitlistMode);
            this.dispatchEvent(new CustomEvent('waitlist:mode-change', {
              bubbles: true,
              detail: { isWaitlistMode: false }
            }));
          }

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

            if (window.innerWidth <= 900 && matchedVariantOption.getAttribute('data-available') === 'true') {
              this.collapseSizeDrawer();
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

    handleBisSubmission() {
      const emailInput = this.querySelector(this.selectors.bisEmail);
      const responseEl = this.querySelector(this.selectors.bisResponse);
      const bisSubmit = this.querySelector(this.selectors.bisSubmit);
      const masterSelect = this.querySelector(this.selectors.masterSelect);

      if (!emailInput || !responseEl) return;

      const email = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        responseEl.textContent = responseEl.getAttribute('data-error') || 'Please enter a valid email address.';
        responseEl.className = 'pdp-bis-box__response text-reg-14 is-error js-pdp-bis-response';
        responseEl.setAttribute('aria-hidden', 'false');
        emailInput.focus();
        return;
      }

      const variantId = bisSubmit ? bisSubmit.getAttribute('data-variant-id') : (masterSelect ? masterSelect.value : '');
      const productId = bisSubmit ? bisSubmit.getAttribute('data-product-id') : '';

      const successMsg = responseEl.getAttribute('data-success') || 'Thank you! We will notify you when this item is back in stock.';
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
          responseEl.textContent = msg || successMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-success js-pdp-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
          emailInput.value = '';
        } else {
          responseEl.textContent = msg || errorMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-error js-pdp-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
        }
      };

      if (window.BIS && typeof window.BIS.create === 'function') {
        window.BIS.create(email, variantId, productId)
          .then((res) => {
            if (res && res.status === 'OK') {
              onComplete(true, res.message || successMsg);
            } else {
              const err = res && res.errors ? Object.values(res.errors).flat().join(' ') : errorMsg;
              onComplete(false, err);
            }
          })
          .catch(() => {
            onComplete(true, successMsg);
          });
      } else {
        setTimeout(() => {
          onComplete(true, successMsg);
        }, 400);
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
        if (isAvailable) {
          bisBox.classList.remove('is-active');
          bisBox.setAttribute('aria-hidden', 'true');
          if (bisResponse) bisResponse.setAttribute('aria-hidden', 'true');
        } else {
          bisBox.classList.add('is-active');
          bisBox.setAttribute('aria-hidden', 'false');
          if (bisSubmit) bisSubmit.setAttribute('data-variant-id', variantId);
        }
      }

      const wishlistAdd = this.querySelector(this.selectors.wishlistAddBtn);
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
        const variantId = wishlistBtn.getAttribute('data-variant') || wishlistBtn.dataset.variant;
        const productId = wishlistBtn.getAttribute('data-product') || wishlistBtn.dataset.product;

        const isCurrentlyAdded = wishlistBtn.classList.contains('is-added') || wishlistBtn.classList.contains('iwishAdded');

        if (isCurrentlyAdded) {
          wishlistBtn.classList.remove('is-added', 'iwishAdded');
          if (window.wishlist && typeof window.wishlist.removeFromWishlist === 'function') {
            const dummy = document.createElement('button');
            dummy.dataset.variant = variantId;
            dummy.dataset.product = productId;
            window.wishlist.removeFromWishlist(dummy, variantId, false);
          }
        } else {
          wishlistBtn.classList.add('is-added', 'iwishAdded');
          if (window.wishlist && typeof window.wishlist.addToWishlist === 'function') {
            const dummy = document.createElement('button');
            dummy.dataset.variant = variantId;
            dummy.dataset.product = productId;
            dummy.dataset.pTitle = wishlistBtn.getAttribute('data-pTitle') || '';
            window.wishlist.addToWishlist(dummy, variantId, 'false');
          }
        }
      }, { signal });
    }
  }

  customElements.define('product-buy-buttons', ProductBuyButtons);
}

if (!customElements.get('sticky-atc-mobile')) {
  class StickyAtcMobile extends HTMLElement {
    static selectors = {
      drawer: '.js-sticky-atc-drawer',
      backdrop: '.js-sticky-atc-backdrop',
      submitButton: '.js-sticky-atc-submit',
      submitText: '.js-sticky-atc-submit-text',
      sizeBtn: '.js-sticky-atc-size-btn',
      bisBox: '.js-sticky-atc-bis-box',
      bisEmail: '.js-sticky-atc-bis-email',
      bisSubmit: '.js-sticky-atc-bis-submit',
      bisResponse: '.js-sticky-atc-bis-response',
      buyButtons: 'product-buy-buttons',
      pdpSubmitButton: '.js-pdp-submit'
    };

    static classes = {
      visible: 'is-visible',
      drawerOpen: 'is-open',
      drawerExpanded: 'is-expanded',
      backdropActive: 'is-visible',
      waitlistMode: 'is-waitlist-mode',
      selected: 'is-selected',
      editorialActive: 'is-editorial-active'
    };

    static config = {
      breakpoint: 900,
      swipeThreshold: 20,
      wheelThreshold: 15
    };

    constructor() {
      super();
      this.abortController = null;
      this.touchStartY = 0;
      this.touchStartX = 0;
      this.isTouching = false;
      this.lastSlideIndex = 0;
      this.selectedVariantId = null;
      this.isAvailable = true;
    }

    connectedCallback() {
      // Teleport to document.body to avoid stacking context traps in nested parents
      if (this.parentElement !== document.body) {
        if (this.id) {
          const existing = document.getElementById(this.id);
          if (existing && existing !== this) {
            existing.remove();
          }
        }
        document.body.appendChild(this);
        return; // connectedCallback will re-fire on appendChild
      }

      this.initialVariantId = this.getAttribute('data-initial-variant-id') || null;
      this.isAvailable = this.getAttribute('data-product-available') !== 'false';
      this.selectedVariantId = this.initialVariantId;

      this.abortController = new AbortController();
      this.initEvents();
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }

    isMobile() {
      return window.innerWidth <= StickyAtcMobile.config.breakpoint;
    }

    isEditorialActive() {
      return document.body.classList.contains(StickyAtcMobile.classes.editorialActive);
    }

    isDrawerOpen() {
      const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
      return drawer && drawer.classList.contains(StickyAtcMobile.classes.drawerOpen);
    }

    show() {
      if (!this.isMobile() || !this.isEditorialActive()) return;
      this.classList.add(StickyAtcMobile.classes.visible);
      this.setAttribute('aria-hidden', 'false');
    }

    hide() {
      this.classList.remove(StickyAtcMobile.classes.visible);
      this.setAttribute('aria-hidden', 'true');
      this.closeDrawer(true);
    }

    openDrawer() {
      const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
      const backdrop = this.querySelector(StickyAtcMobile.selectors.backdrop);
      const submitText = this.querySelector(StickyAtcMobile.selectors.submitText);
      const submitBtn = this.querySelector(StickyAtcMobile.selectors.submitButton);

      if (drawer) {
        drawer.classList.add(StickyAtcMobile.classes.drawerOpen, StickyAtcMobile.classes.drawerExpanded);
        drawer.setAttribute('aria-expanded', 'true');
      }
      if (backdrop) {
        backdrop.classList.add(StickyAtcMobile.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'false');
      }

      if (submitText && (!drawer || !drawer.classList.contains(StickyAtcMobile.classes.waitlistMode))) {
        const guideText = submitText.getAttribute('data-translation-size-guide') || 'Size & Fit Guide';
        submitText.textContent = guideText;
        if (submitBtn) submitBtn.setAttribute('aria-label', guideText);
      }
    }

    removeVariantParamFromUrl() {
      if (window.history && window.history.replaceState) {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('variant')) {
          currentUrl.searchParams.delete('variant');
          const cleanUrl = currentUrl.pathname + (currentUrl.search ? currentUrl.search : '') + currentUrl.hash;
          window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        }
      }
    }

    closeDrawer(resetSelection = false) {
      const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
      const backdrop = this.querySelector(StickyAtcMobile.selectors.backdrop);
      const bisBox = this.querySelector(StickyAtcMobile.selectors.bisBox);
      const submitText = this.querySelector(StickyAtcMobile.selectors.submitText);
      const submitBtn = this.querySelector(StickyAtcMobile.selectors.submitButton);

      if (drawer) {
        drawer.classList.remove(
          StickyAtcMobile.classes.drawerOpen,
          StickyAtcMobile.classes.drawerExpanded,
          StickyAtcMobile.classes.waitlistMode
        );
        drawer.setAttribute('aria-expanded', 'false');
      }
      if (backdrop) {
        backdrop.classList.remove(StickyAtcMobile.classes.backdropActive);
        backdrop.setAttribute('aria-hidden', 'true');
      }
      if (bisBox) {
        bisBox.classList.remove('is-active');
        bisBox.setAttribute('aria-hidden', 'true');
      }

      if (resetSelection) {
        this.dataset.sizeChosen = 'false';
        this.selectedVariantId = this.initialVariantId;
        this.isAvailable = this.getAttribute('data-product-available') !== 'false';

        const sizeBtns = this.querySelectorAll(StickyAtcMobile.selectors.sizeBtn);
        sizeBtns.forEach((btn) => {
          btn.classList.remove(StickyAtcMobile.classes.selected);
          btn.setAttribute('aria-pressed', 'false');
        });

        this.removeVariantParamFromUrl();

        const buyButtons = document.querySelector(StickyAtcMobile.selectors.buyButtons);
        if (buyButtons && typeof buyButtons.collapseSizeDrawer === 'function') {
          buyButtons.collapseSizeDrawer(true);
        }
      }

      if (submitText) {
        const addText = submitText.getAttribute('data-translation-add-to-cart') || 'Add To Bag';
        const waitlistText = submitText.getAttribute('data-translation-waitlist') || 'Join The Waitlist';
        const label = this.isAvailable ? addText : waitlistText;
        submitText.textContent = label;
        if (submitBtn) submitBtn.setAttribute('aria-label', label);
      }
    }

    initEvents() {
      const { signal } = this.abortController;

      this.syncFromPdp();

      document.addEventListener(
        'variant:change',
        (e) => {
          this.syncVariantFromDetail(e.detail);
        },
        { signal }
      );

      const sizeBtns = this.querySelectorAll(StickyAtcMobile.selectors.sizeBtn);
      sizeBtns.forEach((btn) => {
        btn.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.handleSizeButtonClick(btn);
          },
          { signal }
        );
      });

      const submitBtn = this.querySelector(StickyAtcMobile.selectors.submitButton);
      if (submitBtn) {
        submitBtn.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.handleSubmit();
          },
          { signal }
        );
      }

      const backdrop = this.querySelector(StickyAtcMobile.selectors.backdrop);
      if (backdrop) {
        backdrop.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.closeDrawer(true);
          },
          { signal }
        );
      }

      document.addEventListener(
        'click',
        (e) => {
          if (!this.isMobile() || !this.isDrawerOpen()) return;

          const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
          const submitBtnEl = this.querySelector(StickyAtcMobile.selectors.submitButton);
          const backdropEl = this.querySelector(StickyAtcMobile.selectors.backdrop);

          if (drawer && !drawer.contains(e.target)) {
            if (submitBtnEl && submitBtnEl.contains(e.target)) return;
            if (backdropEl && backdropEl.contains(e.target)) return;

            if (e.target.closest('.drw-Drawer') || e.target.closest('.js-Drawers_Backdrop') || e.target.closest('.drw-Drawers_Backdrop')) return;
            if (e.target.closest('[data-module-drawers-trigger]')) return;

            this.closeDrawer(true);
          }
        },
        { signal }
      );

      document.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && this.isMobile() && this.isDrawerOpen()) {
            this.closeDrawer(true);
          }
        },
        { signal }
      );

      const bisSubmitBtn = this.querySelector(StickyAtcMobile.selectors.bisSubmit);
      if (bisSubmitBtn) {
        bisSubmitBtn.addEventListener(
          'click',
          (e) => {
            e.preventDefault();
            this.handleBisSubmit();
          },
          { signal }
        );
      }

      window.addEventListener(
        'touchstart',
        (e) => {
          if (!this.isMobile() || !this.isEditorialActive()) return;
          if (!e.touches || !e.touches.length) return;
          this.touchStartY = e.touches[0].clientY;
          this.touchStartX = e.touches[0].clientX;
          this.isTouching = true;
        },
        { passive: true, signal }
      );

      window.addEventListener(
        'touchmove',
        (e) => {
          if (!this.isTouching || !this.isMobile() || !this.isEditorialActive()) return;
          if (!e.touches || !e.touches.length) return;

          if (this.isDrawerOpen() && this.contains(e.target)) return;

          const currentY = e.touches[0].clientY;
          const currentX = e.touches[0].clientX;
          const diffY = this.touchStartY - currentY;
          const diffX = Math.abs(this.touchStartX - currentX);

          if (diffX > Math.abs(diffY) * 0.8) return;

          if (diffY > StickyAtcMobile.config.swipeThreshold) {
            this.hide();
            this.touchStartY = currentY;
            this.touchStartX = currentX;
          } else if (diffY < -StickyAtcMobile.config.swipeThreshold) {
            this.show();
            this.touchStartY = currentY;
            this.touchStartX = currentX;
          }
        },
        { passive: true, signal }
      );

      window.addEventListener(
        'touchend',
        () => {
          this.isTouching = false;
        },
        { passive: true, signal }
      );

      window.addEventListener(
        'wheel',
        (e) => {
          if (!this.isMobile() || !this.isEditorialActive()) return;
          if (this.isDrawerOpen() && this.contains(e.target)) return;

          if (e.deltaY > StickyAtcMobile.config.wheelThreshold) {
            this.hide();
          } else if (e.deltaY < -StickyAtcMobile.config.wheelThreshold) {
            this.show();
          }
        },
        { passive: true, signal }
      );

      document.addEventListener(
        'fullpage:slideChange',
        (e) => {
          if (!this.isMobile() || !this.isEditorialActive()) return;
          const activeIndex = e.detail?.activeIndex ?? 0;
          if (activeIndex < this.lastSlideIndex) {
            this.show();
          } else if (activeIndex > this.lastSlideIndex) {
            this.hide();
          }
          this.lastSlideIndex = activeIndex;
        },
        { signal }
      );

      document.addEventListener(
        'pdp:transition:from-editorial',
        () => {
          this.hide();
          this.lastSlideIndex = 0;
        },
        { signal }
      );

      document.addEventListener(
        'pdp:transition:to-editorial',
        () => {
          this.hide();
          this.lastSlideIndex = 0;
        },
        { signal }
      );

      window.addEventListener(
        'resize',
        () => {
          if (!this.isMobile()) {
            this.hide();
          }
        },
        { passive: true, signal }
      );

      document.addEventListener(
        'shopify:section:unload',
        (e) => {
          if (this.dataset.sectionId && e.detail?.sectionId === this.dataset.sectionId) {
            this.remove();
          }
        },
        { signal }
      );
    }

    handleSizeButtonClick(btn) {
      const sizeBtns = this.querySelectorAll(StickyAtcMobile.selectors.sizeBtn);
      sizeBtns.forEach((b) => {
        b.classList.remove(StickyAtcMobile.classes.selected);
        b.setAttribute('aria-pressed', 'false');
      });

      btn.classList.add(StickyAtcMobile.classes.selected);
      btn.setAttribute('aria-pressed', 'true');
      this.dataset.sizeChosen = 'true';

      const variantId = btn.getAttribute('data-variant-id');
      const isAvailable = btn.getAttribute('data-available') === 'true';
      this.selectedVariantId = variantId;
      this.isAvailable = isAvailable;

      const submitText = this.querySelector(StickyAtcMobile.selectors.submitText);
      const submitBtn = this.querySelector(StickyAtcMobile.selectors.submitButton);
      const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
      const bisBox = this.querySelector(StickyAtcMobile.selectors.bisBox);
      const backdrop = this.querySelector(StickyAtcMobile.selectors.backdrop);
      const emailInput = this.querySelector(StickyAtcMobile.selectors.bisEmail);

      const buyButtons = document.querySelector(StickyAtcMobile.selectors.buyButtons);
      if (buyButtons && variantId) {
        const matchingPdpBtn = buyButtons.querySelector(`.js-pdp-size-btn[data-variant-id="${variantId}"]`);
        if (matchingPdpBtn && !matchingPdpBtn.classList.contains('is-selected')) {
          matchingPdpBtn.click();
        }
      }

      if (isAvailable) {
        this.closeDrawer();
        this.dataset.sizeChosen = 'false';

        if (buyButtons) {
          const pdpSubmit = buyButtons.querySelector(StickyAtcMobile.selectors.pdpSubmitButton);
          if (pdpSubmit) {
            pdpSubmit.click();
          }
        }
      } else {
        if (drawer) {
          drawer.classList.add(
            StickyAtcMobile.classes.waitlistMode,
            StickyAtcMobile.classes.drawerOpen,
            StickyAtcMobile.classes.drawerExpanded
          );
          drawer.setAttribute('aria-expanded', 'true');
        }
        if (backdrop) {
          backdrop.classList.add(StickyAtcMobile.classes.backdropActive);
          backdrop.setAttribute('aria-hidden', 'false');
        }
        if (bisBox) {
          bisBox.classList.add('is-active');
          bisBox.setAttribute('aria-hidden', 'false');
        }

        if (submitText) {
          const waitlistText = submitText.getAttribute('data-translation-waitlist') || 'Join The Waitlist';
          submitText.textContent = waitlistText;
          if (submitBtn) submitBtn.setAttribute('aria-label', waitlistText);
        }

        if (emailInput) {
          setTimeout(() => emailInput.focus(), 250);
        }
      }
    }

    handleSubmit() {
      const hasSizeOption = this.dataset.hasSizeOption === 'true';
      const isDrawerOpen = this.isDrawerOpen();
      const drawer = this.querySelector(StickyAtcMobile.selectors.drawer);
      const isWaitlist = drawer && drawer.classList.contains(StickyAtcMobile.classes.waitlistMode);

      if (hasSizeOption && !isDrawerOpen) {
        this.openDrawer();
        return;
      }

      if (isDrawerOpen && !isWaitlist) {
        this.hide();
        const guideModal = document.querySelector('pdp-size-guide');
        if (guideModal && typeof guideModal.openModal === 'function') {
          guideModal.openModal();
        } else {
          const guideTrigger = document.querySelector('.js-pdp-size-guide-trigger');
          guideTrigger?.click();
        }
        return;
      }

      if (isWaitlist) {
        const emailInput = this.querySelector(StickyAtcMobile.selectors.bisEmail);
        if (emailInput && !emailInput.value.trim()) {
          emailInput.focus();
        } else {
          this.handleBisSubmit();
        }
      }
    }

    handleBisSubmit() {
      const emailInput = this.querySelector(StickyAtcMobile.selectors.bisEmail);
      const responseEl = this.querySelector(StickyAtcMobile.selectors.bisResponse);
      const email = emailInput ? emailInput.value.trim() : '';

      const successMsg = responseEl?.getAttribute('data-success') || 'Thank you for joining the waitlist.';
      const invalidEmailMsg = responseEl?.getAttribute('data-invalid-email') || 'Please enter a valid email address.';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (responseEl) {
          responseEl.textContent = invalidEmailMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-error js-sticky-atc-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
        }
        return;
      }

      const buyButtons = document.querySelector(StickyAtcMobile.selectors.buyButtons);
      const nativeEmail = buyButtons?.querySelector('.js-pdp-bis-email');
      const nativeSubmit = buyButtons?.querySelector('.js-pdp-bis-submit');

      if (nativeEmail && nativeSubmit) {
        nativeEmail.value = email;
        nativeSubmit.click();

        setTimeout(() => {
          const nativeResponse = buyButtons.querySelector('.js-pdp-bis-response');
          if (nativeResponse && responseEl) {
            responseEl.innerHTML = nativeResponse.innerHTML || successMsg;
            responseEl.className = nativeResponse.classList.contains('is-error')
              ? 'pdp-bis-box__response text-reg-14 is-error js-sticky-atc-bis-response'
              : 'pdp-bis-box__response text-reg-14 is-success js-sticky-atc-bis-response';
            responseEl.setAttribute('aria-hidden', 'false');
            if (!nativeResponse.classList.contains('is-error') && emailInput) {
              emailInput.value = '';
            }
          }
        }, 1000);
      } else {
        if (responseEl) {
          responseEl.innerHTML = successMsg;
          responseEl.className = 'pdp-bis-box__response text-reg-14 is-success js-sticky-atc-bis-response';
          responseEl.setAttribute('aria-hidden', 'false');
          if (emailInput) emailInput.value = '';
        }
      }
    }

    syncFromPdp() {
      const buyButtons = document.querySelector(StickyAtcMobile.selectors.buyButtons);
      if (!buyButtons) return;

      const sizeChosen = buyButtons.getAttribute('data-size-chosen') === 'true';
      if (!sizeChosen) return;

      const selectedPdpBtn = buyButtons.querySelector('.js-pdp-size-btn.is-selected');
      if (selectedPdpBtn) {
        const variantId = selectedPdpBtn.getAttribute('data-variant-id');
        const matchingBtn = this.querySelector(`.js-sticky-atc-size-btn[data-variant-id="${variantId}"]`);
        if (matchingBtn) {
          this.handleSizeButtonClick(matchingBtn);
        }
      }
    }

    syncVariantFromDetail(detail) {
      if (!detail) return;
      const { variantId, isAvailable } = detail;
      this.selectedVariantId = variantId;
      this.isAvailable = isAvailable;

      if (variantId) {
        const matchingBtn = this.querySelector(`.js-sticky-atc-size-btn[data-variant-id="${variantId}"]`);
        if (matchingBtn && !matchingBtn.classList.contains(StickyAtcMobile.classes.selected)) {
          const sizeBtns = this.querySelectorAll(StickyAtcMobile.selectors.sizeBtn);
          sizeBtns.forEach((b) => b.classList.remove(StickyAtcMobile.classes.selected));
          matchingBtn.classList.add(StickyAtcMobile.classes.selected);
          this.dataset.sizeChosen = 'true';
        }
      }

      const submitText = this.querySelector(StickyAtcMobile.selectors.submitText);
      const submitBtn = this.querySelector(StickyAtcMobile.selectors.submitButton);
      const isDrawerOpen = this.isDrawerOpen();

      if (submitText && !isDrawerOpen) {
        const addText = submitText.getAttribute('data-translation-add-to-cart') || 'Add To Bag';
        const waitlistText = submitText.getAttribute('data-translation-waitlist') || 'Join The Waitlist';
        const label = isAvailable ? addText : waitlistText;
        submitText.textContent = label;
        if (submitBtn) submitBtn.setAttribute('aria-label', label);
      }
    }
  }

  customElements.define('sticky-atc-mobile', StickyAtcMobile);
}

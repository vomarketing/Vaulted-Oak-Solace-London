/**
 * Contact Modal & Slide-over Drawer Web Component (<contact-modal>)
 * Native Shopify Liquid form submission support
 */

if (!customElements.get('contact-modal')) {
  class ContactModal extends HTMLElement {
    static selectors = {
      triggers: 'a[href*="#contactUSModal"], [data-contact-modal-trigger]',
      closeButtons: '[data-contact-modal-close]',
      container: '.contact-modal__container',
      form: 'form.contact-modal__form',
      status: '.contact-modal__status',
      submitBtn: '.contact-modal__submit',
      spinner: '.contact-modal__spinner',
      focusableElements: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    };

    static classes = {
      open: 'is-open',
      bodyLocked: 'is-contact-modal-open',
      themeOverflowLocked: 'util-SiteOverflowed',
      loading: 'is-loading'
    };

    constructor() {
      super();

      this.isOpen = false;
      this.previousFocusElement = null;
      this.abortController = null;
      this.closeTimeout = null;
    }

    connectedCallback() {
      if (this.parentElement !== document.body) {
        document.querySelectorAll('body > contact-modal').forEach((el) => el.remove());
        document.body.appendChild(this);
        return;
      }

      this.abortController = new AbortController();
      this.container = this.querySelector(ContactModal.selectors.container);
      this.form = this.querySelector(ContactModal.selectors.form);
      this.statusEl = this.querySelector(ContactModal.selectors.status);
      this.submitBtn = this.querySelector(ContactModal.selectors.submitBtn);
      this.spinner = this.querySelector(ContactModal.selectors.spinner);

      this.bindEvents();
      this.initModalState();
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
      }
      this.unlockBodyScroll();
    }

    bindEvents() {
      const { signal } = this.abortController;

      // Event delegation for opening triggers (#contactUSModal) and close buttons
      document.addEventListener(
        'click',
        (event) => {
          const trigger = event.target.closest(ContactModal.selectors.triggers);
          if (trigger) {
            event.preventDefault();
            this.open(trigger);
            return;
          }

          const closeBtn = event.target.closest(ContactModal.selectors.closeButtons);
          if (closeBtn && this.contains(closeBtn)) {
            event.preventDefault();
            this.close();
          }
        },
        { signal }
      );

      // Keyboard events (Escape to close, Tab focus trap)
      window.addEventListener(
        'keydown',
        (event) => {
          if (!this.isOpen) return;

          if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
          } else if (event.key === 'Tab') {
            this.handleFocusTrap(event);
          }
        },
        { signal }
      );

      // URL Hash changes
      window.addEventListener('hashchange', () => this.checkUrlHash(), { signal });

      if (this.form) {
        this.form.addEventListener(
          'submit',
          () => {
            if (typeof this.form.checkValidity === 'function' && !this.form.checkValidity()) {
              return;
            }
            this.setLoading(true);
          },
          { signal }
        );
      }
    }

    initModalState() {
      const shouldOpenFromLiquid = this.hasAttribute('data-open-on-load');
      const hasPostedQuery = window.location.search.includes('contact_posted=true');
      const hasFormTypeContact = window.location.search.includes('form_type=contact');
      const hasMatchingHash = this.isMatchingHash();

      if (shouldOpenFromLiquid || hasPostedQuery || hasFormTypeContact || hasMatchingHash) {
        this.open();

        if (this.statusEl && this.statusEl.children.length > 0) {
          requestAnimationFrame(() => {
            try {
              this.statusEl.focus();
            } catch (_) {}
          });
        }
      }
    }

    isMatchingHash() {
      const hash = window.location.hash.toLowerCase();
      return hash === '#contactusmodal' || hash === '#contactmodalform';
    }

    checkUrlHash() {
      if (this.isMatchingHash()) {
        this.open();
      }
    }

    open(triggerEl = null) {
      if (this.isOpen) return;

      if (window.drawers && window.drawers.activeDrawerKey) {
        window.drawers.activeDrawerKey = '';
      }

      this.isOpen = true;
      this.previousFocusElement = triggerEl || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      if (this.previousFocusElement) {
        this.previousFocusElement.setAttribute('aria-expanded', 'true');
      }

      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }

      this.hidden = false;
      this.setAttribute('aria-hidden', 'false');
      this.lockBodyScroll();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.classList.add(ContactModal.classes.open);
          this.focusInitialElement();
        });
      });

      this.dispatchEvent(new CustomEvent('contact-modal:opened', { bubbles: true }));
    }

    close() {
      if (!this.isOpen) return;

      this.isOpen = false;
      this.classList.remove(ContactModal.classes.open);
      this.unlockBodyScroll();

      // Clear matching hash/query from URL without page reload
      this.cleanUrlParams();

      this.closeTimeout = setTimeout(() => {
        if (!this.isOpen) {
          this.hidden = true;
          this.setAttribute('aria-hidden', 'true');
          this.removeAttribute('data-open-on-load');
        }
      }, 400);

      if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
        try {
          this.previousFocusElement.setAttribute('aria-expanded', 'false');
          const drawer = this.previousFocusElement.closest('[data-module-drawers-drawer]');
          if (drawer && !drawer.classList.contains('drw-Drawer-active')) {
            const drawerKey = drawer.getAttribute('data-module-drawers-drawer');
            const drawerTrigger = document.querySelector(`[data-module-drawers-trigger="${drawerKey}"]`);
            if (drawerTrigger && typeof drawerTrigger.focus === 'function') {
              drawerTrigger.focus();
            } else {
              this.previousFocusElement.focus();
            }
          } else {
            this.previousFocusElement.focus();
          }
        } catch (_) {}
      }
      this.previousFocusElement = null;

      this.dispatchEvent(new CustomEvent('contact-modal:closed', { bubbles: true }));
    }

    cleanUrlParams() {
      if (!window.history || !window.history.replaceState) return;

      const url = new URL(window.location.href);
      let changed = false;

      if (url.searchParams.has('contact_posted')) {
        url.searchParams.delete('contact_posted');
        changed = true;
      }

      if (url.searchParams.has('form_type')) {
        url.searchParams.delete('form_type');
        changed = true;
      }

      // Clean form repopulation query params like contact[body], contact[email], etc.
      const keysToDelete = [];
      for (const key of url.searchParams.keys()) {
        if (key.startsWith('contact[') || key.startsWith('contact%5B') || key.startsWith('contact')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => {
        url.searchParams.delete(key);
        changed = true;
      });

      const hash = url.hash.toLowerCase();
      if (hash === '#contactusmodal' || hash === '#contactmodalform') {
        url.hash = '';
        changed = true;
      }

      if (changed) {
        const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
        window.history.replaceState(null, '', url.pathname + cleanSearch + url.hash);
      }
    }

    lockBodyScroll() {
      document.body.classList.add(ContactModal.classes.bodyLocked, ContactModal.classes.themeOverflowLocked);
    }

    unlockBodyScroll() {
      document.body.classList.remove(ContactModal.classes.bodyLocked, ContactModal.classes.themeOverflowLocked);
    }

    focusInitialElement() {
      if (this.statusEl && this.statusEl.children.length > 0) {
        this.statusEl.focus();
        return;
      }

      const closeButton = this.querySelector(ContactModal.selectors.closeButtons);
      if (closeButton instanceof HTMLElement) {
        closeButton.focus();
        return;
      }

      const firstInput = this.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    }

    handleFocusTrap(event) {
      const focusableEls = Array.from(this.querySelectorAll(ContactModal.selectors.focusableElements)).filter(
        (el) => el.offsetParent !== null && !el.hasAttribute('disabled')
      );

      if (focusableEls.length === 0) return;

      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    setLoading(isLoading) {
      if (!this.submitBtn) return;

      this.submitBtn.disabled = isLoading;
      this.submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      this.submitBtn.classList.toggle(ContactModal.classes.loading, isLoading);

      if (this.spinner) {
        this.spinner.hidden = !isLoading;
      }
    }
  }

  customElements.define('contact-modal', ContactModal);
}

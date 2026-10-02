(() => {
  if (window.SolaceMegaMenu) return;
  const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  class MegaMenuController {
    constructor(header) {
      this.header = header;
      this.abort = new AbortController();
      this.media = matchMedia('(min-width: 1201px)');
      this.state = 'closed';
      this.panel = null;
      this.trigger = null;
      this.inertNodes = [];
      this.swiperState = null;
      const options = { signal: this.abort.signal };
      header.addEventListener('click', (e) => this.onClick(e), { ...options, capture: true });
      // Isolate managed items from delegated legacy hover/focus dropdown handlers.
      for (const type of ['mouseover', 'mouseenter', 'focusin']) {
        header.addEventListener(type, (e) => {
          if (e.target.closest('[data-mega-item]')) e.stopImmediatePropagation();
        }, { ...options, capture: true });
      }
      header.addEventListener('pointerover', (e) => {
        if (e.pointerType === 'touch' || !this.panel) return;
        const link = e.target.closest('[data-mega-link]');
        if (link && this.panel.contains(link)) this.activate(link);
      }, options);
      header.addEventListener('focusin', (e) => {
        const link = e.target.closest('[data-mega-link]');
        if (link && this.panel?.contains(link)) this.activate(link);
      }, options);
      document.addEventListener('keydown', (e) => this.onKeydown(e), { ...options, capture: true });
      document.addEventListener('focusin', (e) => {
        if (this.panel && !this.panel.contains(e.target)) {
          this.firstFocus()?.focus({ preventScroll: true });
        }
      }, options);
      // Prevent document/window wheel handlers from receiving menu scrolling.
      header.addEventListener('wheel', (e) => { if (this.panel) e.stopPropagation(); }, { ...options, passive: true });
      header.addEventListener('touchmove', (e) => { if (this.panel) e.stopPropagation(); }, { ...options, passive: true });
      document.addEventListener('fullpage:ready', () => {
        if (this.panel) this.lockSwiper();
      }, options);
      this.media.addEventListener('change', () => {
        if (!this.media.matches && this.panel) {
          this.close(false);
          const mobileTrigger = this.header.querySelector('.mb-MenuTrigger');
          if (mobileTrigger?.getClientRects().length) mobileTrigger.focus({ preventScroll: true });
        }
      }, options);
    }
    onClick(e) {
      const trigger = e.target.closest('[data-mega-trigger]');
      if (trigger) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!this.media.matches) return;
        if (this.trigger === trigger && this.panel) this.close();
        else this.open(trigger);
        return;
      }
      if (!this.panel) return;
      if (e.target.closest('[data-mega-close],[data-mega-dismiss]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
        return;
      }
      // Restore the page before an existing search/cart drawer takes focus.
      if (e.target.closest('[data-module-drawers-trigger]')) this.close(false);
      // Item anchors intentionally retain normal navigation. Future detail
      // handling can be added here without changing hover/focus preview logic.
    }
    open(trigger) {
      const panel = document.getElementById(trigger.dataset.megaTrigger);
      if (!panel || !this.header.contains(panel)) return;
      if (this.panel) this.close(false);
      this.trigger = trigger;
      this.panel = panel;
      this.state = 'overview';
      this.header.querySelectorAll('.hd-Nav_Item-dropdownActive').forEach(el => el.classList.remove('hd-Nav_Item-dropdownActive'));
      this.header.classList.remove('hd-Header-dropdownActive');
      this.header.querySelector('.hd-Header_NavBackdrop')?.classList.remove('hd-Header-dropdownActive');
      this.savedAttributes = ['role', 'aria-modal', 'aria-label'].map(name => [name, this.header.getAttribute(name)]);
      this.header.setAttribute('role', 'dialog');
      this.header.setAttribute('aria-modal', 'true');
      this.header.setAttribute('aria-label', `${trigger.textContent.trim()} navigation`);
      this.header.setAttribute('data-mega-open', '');
      panel.dataset.state = this.state;
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      this.applyColors(null);
      this.lockPage();
      this.lockSwiper();
      this.firstFocus()?.focus({ preventScroll: true });
      this.header.dispatchEvent(new CustomEvent('mega-menu:open', { bubbles: true, detail: { id: panel.id } }));
    }
    firstFocus() { return this.panel?.querySelector('[data-mega-link]') || this.panel?.querySelector('[data-mega-close]'); }
    activate(link) {
      if (!this.panel) return;
      this.panel.querySelectorAll('[data-mega-link]').forEach(el => el.classList.toggle('is-active', el === link));
      this.panel.querySelectorAll('[data-mega-preview]').forEach(el => {
        const active = el.dataset.megaPreview === link.dataset.megaLink;
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-hidden', String(!active));
        el.inert = !active;
        if (active) el.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      });
      this.applyColors(link);
    }
    applyColors(link) {
      const own = link?.dataset || {};
      const defaults = this.panel.dataset;
      const background = own.background || defaults.background || '#ffffff';
      const text = own.foreground || defaults.foreground || '#000000';
      const active = own.activeColor || defaults.activeColor || defaults.foreground || '#000000';
      this.header.style.setProperty('--mm-bg', background);
      this.header.style.setProperty('--mm-text', text);
      this.header.style.setProperty('--mm-active', active);
    }
    onKeydown(e) {
      if (!this.panel) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
        return;
      }
      if (e.key === 'Tab') {
        const targets = [
          ...this.panel.querySelectorAll(focusableSelector)
        ].filter(el =>
          !el.closest('[hidden],[inert]') &&
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== 'hidden'
        );
        if (!targets.length) { e.preventDefault(); return; }
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (e.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
      // Swiper binds document keyboard events. Let native menu scrolling and
      // button activation work, but don't deliver keys to background handlers.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) e.stopImmediatePropagation();
    }
    lockPage() {
      document.body.setAttribute('data-mega-menu-open', '');
      this.savedOverflow = document.body.style.overflow;
      this.savedPadding = document.body.style.paddingRight;
      this.savedHtmlOverflow = document.documentElement.style.overflow;
      const gutter = Math.max(0, innerWidth - document.documentElement.clientWidth);
      if (gutter) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Keep the existing Header inside the dialog so its Shop toggle, logo,
      // Search/Account links remain operable and do not need duplicate markup.
      let branch = this.header;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && !['SCRIPT','STYLE','LINK'].includes(sibling.tagName)) {
            this.inertNodes.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        }
        branch = branch.parentElement;
        if (branch === document.body) break;
      }
    }
    lockSwiper() {
      const swiper = window.fullpageScrollInstance?.swiper;
      if (!swiper || swiper.destroyed) return;
      if (this.swiperState?.swiper !== swiper) {
        this.swiperState = { swiper, touch: swiper.allowTouchMove, wheel: !!swiper.mousewheel?.enabled, keyboard: !!swiper.keyboard?.enabled };
      }
      swiper.allowTouchMove = false;
      swiper.mousewheel?.disable();
      swiper.keyboard?.disable();
    }

    close(restoreFocus = true) {
      if (!this.panel) return;

      if (!restoreFocus) {
        this.finishClose(false);
        return;
      }

      if (this.state === 'closing') return;

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (reduceMotion) {
        this.finishClose(restoreFocus);
        return;
      }

      const panel = this.panel;
      const surface = panel.querySelector('[data-mega-surface]');

      if (!surface) {
        this.finishClose(restoreFocus);
        return;
      }

      this.state = 'closing';
      panel.dataset.state = 'closing';

      let timer;

      const complete = () => {
        if (this.panel === panel) {
          this.finishClose(restoreFocus);
        }
      };

      const onAnimationEnd = (event) => {
        if (
          event.target === surface &&
          event.animationName === 'mm-close'
        ) {
          complete();
        }
      };

      this.cancelCloseAnimation = () => {
        clearTimeout(timer);
        surface.removeEventListener('animationend', onAnimationEnd);
      };

      surface.addEventListener('animationend', onAnimationEnd);
      panel.classList.add('is-closing');

      timer = setTimeout(complete, 550);
    }

    finishClose(restoreFocus = true) {
      if (!this.panel) return;

      this.cancelCloseAnimation?.();
      this.cancelCloseAnimation = null;
      this.panel.classList.remove('is-closing');

      const oldTrigger = this.trigger;
      this.panel.hidden = true;
      this.panel.dataset.state = 'closed';
      this.panel.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
      this.panel.querySelectorAll('[data-mega-preview]').forEach(el => { el.setAttribute('aria-hidden','true'); el.inert = true; });
      oldTrigger?.setAttribute('aria-expanded', 'false');
      this.header.removeAttribute('data-mega-open');
      for (const [name, value] of this.savedAttributes) {
        if (value === null) this.header.removeAttribute(name); else this.header.setAttribute(name, value);
      }
      for (const prop of ['--mm-bg','--mm-text','--mm-active']) this.header.style.removeProperty(prop);
      document.body.removeAttribute('data-mega-menu-open');
      document.body.style.overflow = this.savedOverflow;
      document.body.style.paddingRight = this.savedPadding;
      document.documentElement.style.overflow = this.savedHtmlOverflow;
      for (const [el, wasInert] of this.inertNodes) el.inert = wasInert;
      this.inertNodes = [];
      const saved = this.swiperState;
      if (saved && !saved.swiper.destroyed) {
        saved.swiper.allowTouchMove = saved.touch;
        if (saved.wheel) saved.swiper.mousewheel?.enable();
        if (saved.keyboard) saved.swiper.keyboard?.enable();
      }
      this.swiperState = null;
      this.panel = null;
      this.trigger = null;
      this.state = 'closed';
      if (restoreFocus && oldTrigger?.isConnected && oldTrigger.getClientRects().length) oldTrigger.focus({ preventScroll: true });
      this.header.dispatchEvent(new CustomEvent('mega-menu:close', { bubbles: true }));
    }
    destroy() { this.close(false); this.abort.abort(); }
  }
  window.SolaceMegaMenu = MegaMenuController;
  const mount = () => {
    const header = document.querySelector('.js-header');
    if (window.solaceMegaMenu?.header === header) return;
    window.solaceMegaMenu?.destroy();
    window.solaceMegaMenu = header ? new MegaMenuController(header) : null;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  document.addEventListener('shopify:section:load', mount);
  document.addEventListener('shopify:section:unload', e => {
    if (e.target.contains(window.solaceMegaMenu?.header)) {
      window.solaceMegaMenu.destroy(); window.solaceMegaMenu = null;
    }
  });
  document.addEventListener('shopify:block:select', e => {
    const panel = e.target.closest('[data-mega-panel]');
    const controller = window.solaceMegaMenu;
    if (!panel || !controller?.media.matches) return;
    const trigger = [...controller.header.querySelectorAll('[data-mega-trigger]')].find(el => el.dataset.megaTrigger === panel.id);
    if (trigger) controller.open(trigger);
  });
})();

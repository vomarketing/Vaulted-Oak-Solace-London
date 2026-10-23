(() => {
  if (window.SolaceMobileMenu) return;

  const submenuSelector = '[data-mobile-menu-submenu]';
  const triggerSelector = '[data-mobile-menu-toggle-submenu]';
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const menuTransitionDuration = 600;
  const colorProperties = ['--mobile-menu-background', '--mobile-menu-text', '--mobile-menu-active'];

  class MobileMenuController {
    constructor(header) {
      this.header = header;
      this.menu = header.querySelector('[data-mobile-menu]');
      this.panel = this.menu?.querySelector('[data-mobile-menu-panel]');
      this.navigation = this.menu?.querySelector('.hd-MobileMenu_Navigation');
      this.rootView = this.navigation?.querySelector(':scope > .hd-MobileMenu_Links');
      this.toggle = header.querySelector('[data-mobile-menu-toggle]');
      this.backButton = this.menu?.querySelector('[data-mobile-menu-back]');
      this.activeTitle = this.menu?.querySelector('[data-mobile-menu-title]');
      this.media = matchMedia('(max-width: 901px)');
      this.listeners = new AbortController();
      this.viewStack = [];
      this.inertNodes = [];

      if (!this.menu || !this.panel || !this.toggle) return;

      const options = { signal: this.listeners.signal };
      header.addEventListener('click', (event) => this.onClick(event), { ...options, capture: true });
      document.addEventListener('keydown', (event) => this.onKeydown(event), options);
      this.media.addEventListener('change', () => {
        if (!this.media.matches && !this.menu.hidden) this.close(false);
      }, options);
    }

    onClick(event) {
      const target = event.target;
      const toggle = target.closest('[data-mobile-menu-toggle]');
      if (toggle === this.toggle) {
        event.preventDefault();
        event.stopPropagation();
        this.menu.hidden ? this.open() : this.close();
        return;
      }

      if (this.menu.hidden) return;
      if (target.closest('[data-mobile-menu-close]')) return this.close();

      if (target.closest('[data-mobile-menu-back]')) {
        event.preventDefault();
        this.goBack();
        return;
      }

      const colorItem = target.closest('[data-mobile-menu-colors]');
      if (colorItem && this.menu.contains(colorItem)) this.applyMenuColors(colorItem);

      const submenuToggle = target.closest(triggerSelector);
      if (submenuToggle && this.menu.contains(submenuToggle)) {
        event.preventDefault();
        const submenu = document.getElementById(submenuToggle.getAttribute('aria-controls'));
        if (submenu && this.menu.contains(submenu)) {
          const currentView = this.viewStack[this.viewStack.length - 1]?.element;
          const isLevelTwoDetail = submenu.classList.contains('hd-MobileMenu_Submenu-detail')
            && (submenu.parentElement?.closest(submenuSelector) || this.rootView) === currentView;
          if (isLevelTwoDetail) this.setAccordionOpen(submenu, submenu.hidden || submenu.inert, submenuToggle);
          else this.setSubmenuOpen(submenu, submenu.hidden || submenu.inert, false, submenuToggle);
        }
        return;
      }

      if (target.closest('[data-module-drawers-trigger],[data-help-box-open],[data-contact-modal-trigger],a[href*="#contactUSModal"]')) this.close(false);
    }

    open() {
      if (!this.media.matches) return;
      if (document.querySelector('.drw-Drawer-search.drw-Drawer-active')) {
        if (window.drawers) window.drawers.activeDrawerKey = '';
        else document.querySelector('.drw-Drawer-search.drw-Drawer-active [data-module-drawers-close]')?.click();
      }
      this.returnFocus = this.toggle;
      this.previousHeaderMode = this.header.getAttribute('data-header-mode');
      this.savedMenuColors = colorProperties.map((property) => [
        property,
        this.header.style.getPropertyValue(property),
        this.header.style.getPropertyPriority(property)
      ]);
      if (this.previousHeaderMode === 'light') {
        this.header.setAttribute('data-header-mode', 'dark');
      }
      this.menu.style.setProperty('--mobile-menu-header-height', `${Math.max(0, this.header.getBoundingClientRect().bottom)}px`);
      this.applyMenuColors();
      this.menu.hidden = false;
      this.menu.setAttribute('role', 'dialog');
      this.menu.setAttribute('aria-modal', 'true');
      this.menu.setAttribute('aria-label', 'Main navigation');
      this.menu.removeAttribute('data-open');
      this.openFrame = requestAnimationFrame(() => {
        this.openFrame = requestAnimationFrame(() => {
          if (!this.menu.hidden) this.menu.setAttribute('data-open', '');
        });
      });
      this.toggle.setAttribute('aria-expanded', 'true');
      this.toggle.setAttribute('aria-label', 'Close menu');
      this.header.setAttribute('data-mobile-menu-open', '');

      this.lockPage();
      this.resetSubmenus();
      this.toggle.focus({ preventScroll: true });
    }

    close(restoreFocus = true) {
      if (this.menu.hidden) return;
      cancelAnimationFrame(this.openFrame);
      this.menu.removeAttribute('data-open');
      clearTimeout(this.closeTimer);
      if (restoreFocus) this.closeTimer = setTimeout(() => this.finishClose(true), menuTransitionDuration);
      else this.finishClose(false);
    }

    finishClose(restoreFocus) {
      cancelAnimationFrame(this.openFrame);
      clearTimeout(this.closeTimer);
      this.menu.hidden = true;
      this.menu.removeAttribute('role');
      this.menu.removeAttribute('aria-modal');
      this.menu.removeAttribute('aria-label');
      this.menu.style.removeProperty('--mobile-menu-header-height');
      this.header.removeAttribute('data-mobile-menu-open');
      if (this.previousHeaderMode === 'light') {
        this.header.setAttribute('data-header-mode', this.previousHeaderMode);
      }
      this.restoreMenuColors();
      this.toggle.setAttribute('aria-expanded', 'false');
      this.toggle.setAttribute('aria-label', 'Open menu');
      this.unlockPage();
      this.resetSubmenus();
      if (restoreFocus && this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
      this.returnFocus = null;
      this.previousHeaderMode = null;
    }

    setSubmenuOpen(submenu, open, restoreFocus = false, trigger = this.findTrigger(submenu)) {
      if (open) {
        const currentView = this.viewStack[this.viewStack.length - 1]?.element || this.rootView;
        if (!currentView || !submenu.parentElement) return;
        const view = {
          element: submenu,
          trigger,
          origin: submenu.parentElement,
          nextSibling: submenu.nextSibling,
          previousView: currentView
        };
        currentView.hidden = true;
        currentView.inert = true;
        view.trigger?.setAttribute('aria-expanded', 'true');
        view.trigger?.classList.add('is-open');
        this.viewStack.push(view);
        this.navigation.append(submenu);
        submenu.hidden = false;
        submenu.inert = false;
        this.setActiveTitle(trigger?.textContent.trim());
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (this.viewStack.some((entry) => entry.element === submenu)) submenu.setAttribute('data-open', '');
        }));
        this.applyMenuColors(trigger);
        this.backButton.hidden = false;
        this.backButton.focus({ preventScroll: true });
        return;
      }

      const view = this.viewStack[this.viewStack.length - 1];
      if (!view || view.element !== submenu) return;
      submenu.querySelectorAll(submenuSelector).forEach((child) => this.hideSubmenu(child));
      submenu.removeAttribute('data-open');
      submenu.inert = true;
      submenu.hidden = true;
      view.origin.insertBefore(submenu, view.nextSibling?.parentElement === view.origin ? view.nextSibling : null);
      this.viewStack.pop();
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.classList.remove('is-open');
      const parentView = this.viewStack[this.viewStack.length - 1];
      const element = parentView?.element || this.rootView;
      element.hidden = false;
      element.inert = false;
      this.backButton.hidden = this.viewStack.length <= 1;
      this.setActiveTitle(parentView?.trigger?.textContent.trim());
      this.applyMenuColors(parentView?.trigger || null);
      if (restoreFocus) trigger?.focus({ preventScroll: true });
    }

    goBack() {
      const currentView = this.viewStack[this.viewStack.length - 1];
      if (currentView) this.setSubmenuOpen(currentView.element, false, true, currentView.trigger);
    }

    setAccordionOpen(submenu, open, trigger) {
      const parentSubmenu = submenu.parentElement?.closest(submenuSelector);
      this.menu.querySelectorAll('[data-mobile-menu-submenu][data-accordion-open]').forEach((item) => {
        if (item !== submenu && item.parentElement?.closest(submenuSelector) === parentSubmenu) {
          item.hidden = true;
          item.inert = true;
          item.removeAttribute('data-open');
          item.removeAttribute('data-accordion-open');
          const siblingTrigger = this.findTrigger(item);
          siblingTrigger?.setAttribute('aria-expanded', 'false');
          siblingTrigger?.classList.remove('is-open');
        }
      });

      trigger.setAttribute('aria-expanded', String(open));
      trigger.classList.toggle('is-open', open);
      if (!open) {
        submenu.hidden = true;
        submenu.inert = true;
        submenu.removeAttribute('data-open');
        submenu.removeAttribute('data-accordion-open');
        this.applyMenuColors(this.viewStack[this.viewStack.length - 1]?.trigger || null);
        return;
      }

      submenu.hidden = false;
      submenu.inert = false;
      submenu.setAttribute('data-accordion-open', '');
      this.applyMenuColors(trigger);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (submenu.hasAttribute('data-accordion-open')) submenu.setAttribute('data-open', '');
      }));
    }

    closeActiveAccordion() {
      const currentView = this.viewStack[this.viewStack.length - 1]?.element;
      const accordion = currentView?.querySelector('[data-mobile-menu-submenu][data-accordion-open]');
      if (accordion) this.setAccordionOpen(accordion, false, this.findTrigger(accordion));
      return !!accordion;
    }

    setActiveTitle(title = '') {
      this.activeTitle.textContent = title;
      this.activeTitle.hidden = !title;
    }

    hideSubmenu(submenu) {
      submenu.hidden = true;
      submenu.inert = true;
      submenu.removeAttribute('data-open');
      const trigger = this.findTrigger(submenu);
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.classList.remove('is-open');
    }

    resetSubmenus() {
      for (const view of this.viewStack.slice(1).reverse()) {
        view.element.removeAttribute('data-open');
        view.element.hidden = true;
        view.element.inert = true;
        view.origin.insertBefore(view.element, view.nextSibling?.parentElement === view.origin ? view.nextSibling : null);
        view.trigger?.setAttribute('aria-expanded', 'false');
        view.trigger?.classList.remove('is-open');
      }
      this.viewStack = this.rootView ? [{ element: this.rootView, trigger: null }] : [];
      if (this.rootView) {
        this.rootView.hidden = false;
        this.rootView.inert = false;
      }
      this.backButton.hidden = true;
      this.setActiveTitle();
      this.menu.querySelectorAll(submenuSelector).forEach((submenu) => this.hideSubmenu(submenu));
    }

    findTrigger(submenu) {
      return [...this.menu.querySelectorAll(triggerSelector)]
        .find((button) => button.getAttribute('aria-controls') === submenu.id);
    }

    applyMenuColors(item = null) {
      const defaults = this.menu.dataset;
      const colors = item?.dataset || {};
      this.header.style.setProperty('--mobile-menu-background', colors.background || defaults.background || '#ffffff');
      this.header.style.setProperty('--mobile-menu-text', colors.foreground || defaults.foreground || '#000000');
      this.header.style.setProperty('--mobile-menu-active', colors.activeColor || colors.foreground || defaults.activeColor || defaults.foreground || '#000000');
    }

    restoreMenuColors() {
      this.savedMenuColors?.forEach(([property, value, priority]) => {
        if (value) this.header.style.setProperty(property, value, priority);
        else this.header.style.removeProperty(property);
      });
      this.savedMenuColors = null;
    }

    onKeydown(event) {
      if (this.menu.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (this.closeActiveAccordion()) return;
        this.viewStack.length > 1 ? this.goBack() : this.close();
        return;
      }
      if (event.key !== 'Tab') return;

      const header = this.header.querySelector('.hd-Header_Body');
      const focusable = [...(header?.querySelectorAll(focusableSelector) || []), ...this.panel.querySelectorAll(focusableSelector)]
        .filter((element) => !element.closest('[hidden],[inert]') && element.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return event.preventDefault();
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    lockPage() {
      this.savedBodyOverflow = document.body.style.overflow;
      this.savedHtmlOverflow = document.documentElement.style.overflow;
      this.savedPadding = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${padding + scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.setAttribute('data-mobile-menu-open', '');

      let branch = this.header;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
            this.inertNodes.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        }
        branch = branch.parentElement;
        if (branch === document.body) break;
      }
    }

    unlockPage() {
      this.inertNodes.forEach(([element, wasInert]) => { element.inert = wasInert; });
      this.inertNodes = [];
      document.body.removeAttribute('data-mobile-menu-open');
      document.body.style.overflow = this.savedBodyOverflow || '';
      document.body.style.paddingRight = this.savedPadding || '';
      document.documentElement.style.overflow = this.savedHtmlOverflow || '';
    }

    destroy() {
      if (!this.menu.hidden) this.finishClose(false);
      this.listeners.abort();
    }
  }

  window.SolaceMobileMenu = MobileMenuController;

  const mount = () => {
    const header = document.querySelector('.js-header');
    if (window.solaceMobileMenu?.header === header) return;
    window.solaceMobileMenu?.destroy();
    window.solaceMobileMenu = header ? new MobileMenuController(header) : null;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  document.addEventListener('shopify:section:load', mount);
  document.addEventListener('shopify:section:unload', (event) => {
    if (event.target.contains(window.solaceMobileMenu?.header)) {
      window.solaceMobileMenu.destroy();
      window.solaceMobileMenu = null;
    }
  });
})();

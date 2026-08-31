if (!customElements.get('custom-tab')) {
  class CustomTab extends HTMLElement {
    constructor() {
      super();

      this.selectors = {
        nav: '.js-tab-nav',
        toggle: '.js-tab-toggle',
        panels: '.js-tab-panels',
        panel: '.js-tab-panel'
      };

      this.classes = {
        isActive: 'is-active',
        isAnimating: 'is-animating'
      };

      this.nav = null;
      this.panelsEl = null;
      this.toggles = [];
      this.panels = [];
      this.activeIndex = -1;
      this.reduceMotion = null;
      this.animationTimer = null;
      this.abortController = null;

      this.clickHandler = this.onClick.bind(this);
      this.keydownHandler = this.onKeydown.bind(this);
      this.transitionEndHandler = this.onTransitionEnd.bind(this);
    }

    connectedCallback() {
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      this.nav = this.querySelector(this.selectors.nav);
      this.panelsEl = this.querySelector(this.selectors.panels);
      this.toggles = Array.from(this.querySelectorAll(this.selectors.toggle));
      this.panels = Array.from(this.querySelectorAll(this.selectors.panel));

      if (!this.nav || !this.panelsEl || this.toggles.length === 0) return;
      if (this.toggles.length !== this.panels.length) return;

      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

      this.panels.forEach((panel) => panel.removeAttribute('hidden'));

      this.calculateDesktopPanelHeights();

      const expanded = this.toggles.findIndex((toggle) => toggle.getAttribute('aria-expanded') === 'true');
      this.setActive(expanded, { animate: false, scroll: false });

      this.nav.addEventListener('click', this.clickHandler, { signal });
      this.nav.addEventListener('keydown', this.keydownHandler, { signal });
      this.panelsEl.addEventListener('transitionend', this.transitionEndHandler, { signal });

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.calculateDesktopPanelHeights();
        }, 150);
      }, { passive: true, signal });
    }

    calculateDesktopPanelHeights() {
      if (window.innerWidth <= 900 || !this.panels || !this.panels.length) {
        this.style.removeProperty('--custom-tab-max-height');
        return;
      }

      const heights = this.panels.map((panel) => {
        return panel.scrollHeight || panel.offsetHeight;
      }).filter((h) => h > 20);

      if (heights.length > 0) {
        const minHeight = Math.min(...heights);
        const appliedHeight = Math.max(100, minHeight);
        this.style.setProperty('--custom-tab-max-height', `${appliedHeight}px`);
      }
    }

    onClick(event) {
      const toggle = event.target.closest(this.selectors.toggle);
      if (!toggle) return;

      const index = this.toggles.indexOf(toggle);
      if (index === -1) return;

      this.setActive(index === this.activeIndex ? -1 : index);
    }

    onKeydown(event) {
      const lastIndex = this.toggles.length - 1;
      const current = this.toggles.indexOf(document.activeElement);
      if (current === -1) return;

      let index = null;

      switch (event.key) {
        case 'ArrowRight':
          index = current === lastIndex ? 0 : current + 1;
          break;
        case 'ArrowLeft':
          index = current === 0 ? lastIndex : current - 1;
          break;
        case 'Home':
          index = 0;
          break;
        case 'End':
          index = lastIndex;
          break;
        default:
          return;
      }

      event.preventDefault();
      this.toggles[index].focus();
      this.scrollToggleIntoView(this.toggles[index]);
    }

    setActive(index, options = {}) {
      const { animate = true, scroll = true } = options;
      const targetIndex = this.toggles[index] && this.panels[index] ? index : -1;

      const shouldAnimate = animate && !this.reduceMotion.matches;
      const startHeight = shouldAnimate ? this.panelsEl.offsetHeight : 0;

      if (shouldAnimate && startHeight > 0) {
        this.panelsEl.style.height = `${startHeight}px`;
        this.panelsEl.classList.add(this.classes.isAnimating);
      }

      this.toggles.forEach((toggle, i) => {
        toggle.setAttribute('aria-expanded', i === targetIndex ? 'true' : 'false');
      });

      this.panels.forEach((panel, i) => {
        const isActive = i === targetIndex;
        panel.classList.toggle(this.classes.isActive, isActive);
        panel.toggleAttribute('inert', !isActive);

        if (isActive) {
          panel.setAttribute('tabindex', '0');
          panel.scrollTop = 0;
        } else {
          panel.removeAttribute('tabindex');
        }
      });

      this.activeIndex = targetIndex;

      if (shouldAnimate) this.animateHeight(startHeight);
      if (scroll && targetIndex > -1) this.scrollToggleIntoView(this.toggles[targetIndex]);
    }

    animateHeight(startHeight) {
      const endHeight = this.panelsEl.offsetHeight;
      if (startHeight === endHeight) {
        this.resetHeight();
        return;
      }

      window.clearTimeout(this.animationTimer);
      this.panelsEl.classList.add(this.classes.isAnimating);
      this.panelsEl.style.height = `${startHeight}px`;

      void this.panelsEl.offsetHeight;
      this.panelsEl.style.height = `${endHeight}px`;

      this.animationTimer = window.setTimeout(() => this.resetHeight(), 600);
    }

    onTransitionEnd(event) {
      if (event.target !== this.panelsEl || event.propertyName !== 'height') return;

      this.resetHeight();
    }

    resetHeight() {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = null;
      this.panelsEl.style.height = '';
      this.panelsEl.classList.remove(this.classes.isAnimating);
    }

    scrollToggleIntoView(toggle) {
      if (this.nav.scrollWidth <= this.nav.clientWidth) return;

      toggle.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: this.reduceMotion.matches ? 'auto' : 'smooth'
      });
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }

      window.clearTimeout(this.animationTimer);
      this.animationTimer = null;

      this.nav = null;
      this.panelsEl = null;
      this.toggles = [];
      this.panels = [];
    }
  }

  customElements.define('custom-tab', CustomTab);
}

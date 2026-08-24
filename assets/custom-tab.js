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
      this.activeIndex = 0;
      this.reduceMotion = null;
      this.animationTimer = null;

      this.clickHandler = this.onClick.bind(this);
      this.keydownHandler = this.onKeydown.bind(this);
      this.transitionEndHandler = this.onTransitionEnd.bind(this);
    }

    connectedCallback() {
      this.nav = this.querySelector(this.selectors.nav);
      this.panelsEl = this.querySelector(this.selectors.panels);
      this.toggles = Array.from(this.querySelectorAll(this.selectors.toggle));
      this.panels = Array.from(this.querySelectorAll(this.selectors.panel));

      if (!this.nav || !this.panelsEl || this.toggles.length === 0) return;
      if (this.toggles.length !== this.panels.length) return;

      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

      const selected = this.toggles.findIndex((toggle) => toggle.getAttribute('aria-selected') === 'true');
      this.activeIndex = selected > -1 ? selected : 0;

      this.panels.forEach((panel) => panel.removeAttribute('hidden'));
      this.setActive(this.activeIndex, { focus: false, animate: false });

      this.nav.addEventListener('click', this.clickHandler);
      this.nav.addEventListener('keydown', this.keydownHandler);
      this.panelsEl.addEventListener('transitionend', this.transitionEndHandler);
    }

    onClick(event) {
      const toggle = event.target.closest(this.selectors.toggle);
      if (!toggle) return;

      const index = this.toggles.indexOf(toggle);
      if (index === -1 || index === this.activeIndex) return;

      this.setActive(index, { focus: false });
    }

    onKeydown(event) {
      const lastIndex = this.toggles.length - 1;
      let index = null;

      switch (event.key) {
        case 'ArrowRight':
          index = this.activeIndex === lastIndex ? 0 : this.activeIndex + 1;
          break;
        case 'ArrowLeft':
          index = this.activeIndex === 0 ? lastIndex : this.activeIndex - 1;
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
      this.setActive(index);
    }

    setActive(index, options = {}) {
      const { focus = true, animate = true } = options;
      const targetToggle = this.toggles[index];
      const targetPanel = this.panels[index];
      if (!targetToggle || !targetPanel) return;

      const shouldAnimate = animate && !this.reduceMotion.matches;
      const startHeight = shouldAnimate ? this.panelsEl.offsetHeight : 0;

      this.toggles.forEach((toggle, i) => {
        const isActive = i === index;
        toggle.setAttribute('aria-selected', isActive ? 'true' : 'false');
        toggle.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      this.panels.forEach((panel, i) => {
        const isActive = i === index;
        panel.classList.toggle(this.classes.isActive, isActive);
        panel.toggleAttribute('inert', !isActive);

        if (isActive) {
          panel.setAttribute('tabindex', '0');
        } else {
          panel.removeAttribute('tabindex');
        }
      });

      this.activeIndex = index;

      if (shouldAnimate) this.animateHeight(startHeight);
      if (focus) targetToggle.focus();

      this.scrollToggleIntoView(targetToggle);
    }

    animateHeight(startHeight) {
      const endHeight = this.panelsEl.offsetHeight;
      if (startHeight === endHeight) return;

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
      if (this.nav) {
        this.nav.removeEventListener('click', this.clickHandler);
        this.nav.removeEventListener('keydown', this.keydownHandler);
      }

      if (this.panelsEl) {
        this.panelsEl.removeEventListener('transitionend', this.transitionEndHandler);
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

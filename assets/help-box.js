if (!customElements.get('help-box')) {
  class HelpBox extends HTMLElement {
    static selectors = {
      panel: '.hb-HelpBox',
      dialog: '.hb-HelpBox_Dialog',
      open: '[data-help-box-open]',
      close: '[data-help-box-close]'
    };

    static classes = {
      open: 'is-open',
      bodyOpen: 'is-help-box-open'
    };

    constructor() {
      super();

      this.selectors = HelpBox.selectors;
      this.classes = HelpBox.classes;
      this.mobileQuery = window.matchMedia('(max-width: 1200px)');
      this.isOpen = false;
      this.trigger = null;
      this.abortController = null;
    }

    connectedCallback() {
      if (this.parentElement !== document.body) {
        document.querySelectorAll('body > help-box').forEach((el) => el.remove());
        document.body.appendChild(this);
        return;
      }

      this.abortController = new AbortController();
      this.panel = this.querySelector(this.selectors.panel);
      this.dialog = this.querySelector(this.selectors.dialog);

      this.bindEvents();
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }

    bindEvents() {
      const { signal } = this.abortController;

      document.addEventListener(
        'click',
        (e) => {
          const openButton = e.target.closest(this.selectors.open);
          if (openButton) {
            e.preventDefault();
            if (this.isOpen && this.trigger === openButton) this.close();
            else this.open(openButton);
            return;
          }

          if (!this.isOpen) return;

          if (e.target.closest(this.selectors.close)) {
            this.close();
            return;
          }

          if (!this.mobileQuery.matches && !e.target.closest(this.selectors.dialog)) {
            this.close();
          }
        },
        { signal }
      );

      document.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && this.isOpen) this.close();
        },
        { signal }
      );

      this.mobileQuery.addEventListener('change', () => this.syncMode(), { signal });
    }

    open(trigger) {
      this.trigger = trigger;
      this.isOpen = true;
      this.panel.hidden = false;
      this.panel.setAttribute('aria-hidden', 'false');

      this.syncMode();
      this.setExpanded(true);
      requestAnimationFrame(() => {
        if (this.isOpen) this.panel.classList.add(this.classes.open);
      });
      this.dialog.focus();
    }

    close() {
      const trigger = this.trigger;

      this.isOpen = false;
      this.trigger = null;
      this.panel.classList.remove(this.classes.open);
      this.panel.setAttribute('aria-hidden', 'true');

      this.syncMode();
      this.setExpanded(false);

      window.setTimeout(() => {
        if (this.isOpen) return;
        this.panel.hidden = true;
        trigger?.focus();
      }, 280);
    }

    syncMode() {
      const isMobile = this.mobileQuery.matches;

      this.dialog.setAttribute('aria-modal', isMobile ? 'true' : 'false');
      document.body.classList.toggle(this.classes.bodyOpen, this.isOpen && isMobile);
    }

    setExpanded(isExpanded) {
      document.querySelectorAll(this.selectors.open).forEach((button) => {
        button.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      });
    }
  }

  customElements.define('help-box', HelpBox);
}

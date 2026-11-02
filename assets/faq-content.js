if (!customElements.get('faq-content')) {
  customElements.define(
    'faq-content',
    class FaqContent extends HTMLElement {
      connectedCallback() {
        this.abortController?.abort();
        this.abortController = new AbortController();

        const { signal } = this.abortController;

        this.querySelectorAll('[data-faq-question]').forEach((details) => {
          const summary = details.querySelector('summary');

          if (!summary) return;

          summary.addEventListener(
            'click',
            (event) => {
              event.preventDefault();

              const shouldOpen = !details.open;

              if (shouldOpen) {
                this.closeOtherQuestions(details);
              }

              details.open = shouldOpen;
            },
            { signal }
          );
        });

        this.categoryButtons = Array.from(
          this.querySelectorAll('[data-faq-category]')
        );

        this.panels = Array.from(
          this.querySelectorAll('[data-faq-panel]')
        );

        this.select = this.querySelector('[data-faq-select]');

        this.categoryButtons.forEach((button) => {
          button.addEventListener(
            'click',
            () => this.activateCategory(button.dataset.faqCategory),
            { signal }
          );
        });

        this.select?.addEventListener(
          'change',
          () => this.activateCategory(this.select.value),
          { signal }
        );

        this.addEventListener(
          'shopify:block:select',
          (event) => {
            if (!(event.target instanceof Element)) return;

            const panel = event.target.closest('[data-faq-panel]');

            if (!panel || !this.contains(panel)) return;

            this.activateCategory(panel.dataset.faqPanel);

            const question = event.target.closest('[data-faq-question]');

            if (question) {
              this.closeOtherQuestions(question);
              question.open = true;
            }
          },
          { signal }
        );
      }

      disconnectedCallback() {
        this.abortController?.abort();
      }

      closeOtherQuestions(currentQuestion) {
        this.querySelectorAll('[data-faq-question][open]').forEach((question) => {
          if (question !== currentQuestion) {
            question.open = false;
          }
        });
      }

      activateCategory(categoryId) {
        const targetPanel = this.panels.find(
          (panel) => panel.dataset.faqPanel === categoryId
        );

        if (!targetPanel) return;

        this.panels.forEach((panel) => {
          panel.hidden = panel !== targetPanel;
        });

        this.categoryButtons.forEach((button) => {
          const active = button.dataset.faqCategory === categoryId;

          button.classList.toggle('is-active', active);

          if (active) {
            button.setAttribute('aria-current', 'true');
          } else {
            button.removeAttribute('aria-current');
          }
        });

        if (this.select) {
          this.select.value = categoryId;
        }
      }
    }
  );
}
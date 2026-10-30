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

          let animation = null;
          let targetOpen = details.open;

          const resetAnimation = () => {
            if (!animation) return;

            animation.onfinish = null;
            animation.cancel();
            animation = null;

            details.classList.remove('is-animating');
          };

          summary.addEventListener(
            'click',
            (event) => {
              event.preventDefault();

              const startHeight = details.getBoundingClientRect().height;

              targetOpen = animation ? !targetOpen : !details.open;

              if (targetOpen) {
                this.querySelectorAll('[data-faq-question][open]').forEach((other) => {
                  if (other === details) return;

                  const otherSummary = other.querySelector('summary');

                  if (otherSummary) {
                    otherSummary.click();
                  }
                });
              }

              resetAnimation();

              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                details.open = targetOpen;
                return;
              }

              // Measure the natural height of the requested state.
              details.open = targetOpen;

              const endHeight = details.getBoundingClientRect().height;

              // Keep the answer rendered while animating in either direction.
              details.open = true;
              details.classList.add('is-animating');

              animation = details.animate(
                [
                  { height: `${startHeight}px` },
                  { height: `${endHeight}px` }
                ],
                {
                  duration: 300,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  fill: 'both'
                }
              );

              animation.onfinish = () => {
                details.open = targetOpen;
                resetAnimation();
              };
            },
            { signal }
          );

          signal.addEventListener('abort', resetAnimation, { once: true });
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
              question.open = true;
            }
          },
          { signal }
        );
      }

      disconnectedCallback() {
        this.abortController?.abort();
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
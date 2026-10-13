(() => {
  const sections = document.querySelectorAll('.js-shipping-page');

  if (!sections.length) return;

  sections.forEach((section) => {
    const toc = section.querySelector('[data-shipping-toc]');
    const trigger = section.querySelector('[data-shipping-toc-trigger]');
    const overlay = section.querySelector('[data-shipping-toc-overlay]');
    const categoryButtons = section.querySelectorAll('[data-shipping-category]');
    const panels = section.querySelectorAll('[data-shipping-panel]');
    const selectedLabel = section.querySelector('[data-shipping-selected-label]');

    if (!toc || !trigger || !overlay) return;

    const setTocOpen = (open) => {
      toc.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-expanded', String(open));
    };

    trigger.addEventListener('click', () => {
      setTocOpen(toc.getAttribute('aria-expanded') !== 'true');
    });

    overlay.addEventListener('click', () => {
      setTocOpen(false);
    });

    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const selectedCategory = button.dataset.shippingCategory;
        const selectedText = button.textContent.trim();

        if (selectedLabel) {
          selectedLabel.textContent = selectedText;
        }

        categoryButtons.forEach((categoryButton) => {
          const isActive = categoryButton === button;

          categoryButton.classList.toggle('is-active', isActive);

          if (isActive) {
            categoryButton.setAttribute('aria-current', 'true');
          } else {
            categoryButton.removeAttribute('aria-current');
          }
        });

        panels.forEach((panel) => {
          panel.hidden = panel.dataset.shippingPanel !== selectedCategory;
        });

        setTocOpen(false);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setTocOpen(false);
      }
    });
  });
})();
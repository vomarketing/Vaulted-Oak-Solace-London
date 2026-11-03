(() => {
  const sections = document.querySelectorAll('.js-shipping-page');

  if (!sections.length) return;

  sections.forEach((section) => {
    const categoryButtons = section.querySelectorAll('[data-shipping-category]');
    const panels = section.querySelectorAll('[data-shipping-panel]');
    let activeCategory = section.querySelector('[data-shipping-category].is-active')?.dataset.shippingCategory;
    const openFirstParent = section.dataset.openFirstParent !== 'false';

    const mobileLayout = window.matchMedia('(max-width: 1279px)');

    const syncLayout = () => {
      panels.forEach((panel) => {
        if (mobileLayout.matches) {
          panel.hidden = false;
          panel.open = false;
        } else {
          panel.hidden = panel.dataset.shippingPanel !== activeCategory;
          panel.open = true;
        }
      });

      if (mobileLayout.matches && openFirstParent) {
        const firstPanel = panels[0];

        if (firstPanel) firstPanel.open = true;
      }
    };

    panels.forEach((panel) => {
      const summary = panel.querySelector(':scope > summary');

      summary.addEventListener('click', (event) => {
        if (!mobileLayout.matches) event.preventDefault();
      });
    });

    const closeSiblings = (current, siblings) => {
      if (current.open) return;

      const summary = current.querySelector(':scope > summary');
      const topBefore = summary.getBoundingClientRect().top;

      siblings.forEach((sibling) => {
        if (sibling !== current) sibling.open = false;
      });

      const shift = summary.getBoundingClientRect().top - topBefore;
      if (shift) window.scrollBy(0, shift);
    };

    panels.forEach((panel) => {
      panel.querySelector(':scope > summary').addEventListener('click', () => {
        if (mobileLayout.matches) closeSiblings(panel, panels);
      });

      const items = panel.querySelectorAll('.shipping-Page_Item');

      items.forEach((item) => {
        item.querySelector(':scope > summary').addEventListener('click', () => {
          closeSiblings(item, items);
        });
      });
    });

    syncLayout();
    mobileLayout.addEventListener('change', syncLayout);

    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (mobileLayout.matches) return;

        const selectedCategory = button.dataset.shippingCategory;
        activeCategory = selectedCategory;

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
      });
    });
  });
})();

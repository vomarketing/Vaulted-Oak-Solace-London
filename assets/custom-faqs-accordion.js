(() => {
  const ensureOverrideStyles = () => {
    if (document.querySelector('style[data-faq-accordion-override]')) return;

    const faqStyle = document.createElement('style');
    faqStyle.setAttribute('data-faq-accordion-override', 'true');
    faqStyle.textContent = `
      .faq-Page [data-el="accordion.body"],
      .faq-Page .faq-Faqs_Body,
      .faq-Page .faq-Faqs_Icon {
        transition: none !important;
        animation: none !important;
      }
      .faq-Page [data-el="accordion.item"][aria-expanded="false"] .faq-Faqs_Body {
        display: none !important;
        height: 0 !important;
      }
      .faq-Page [data-el="accordion.item"][aria-expanded="true"] .faq-Faqs_Body {
        display: block !important;
        height: auto !important;
      }
      .faq-Page [data-el="accordion.trigger"],
      .faq-Page .faq-Faqs_Header {
        cursor: pointer;
        user-select: none;
      }
    `;
    document.head.appendChild(faqStyle);
  };

  const setItemState = (item, shouldOpen) => {
    if (!item) return;

    item.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

    const trigger = item.querySelector('[data-el="accordion.trigger"]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    const body = item.querySelector('[data-el="accordion.body"]');
    if (body) {
      body.removeAttribute('style');
    }
  };

  const toggleItem = (item, container) => {
    if (!item || !container) return;

    const isCurrentlyOpen = item.getAttribute('aria-expanded') === 'true';
    const openOneAtATime = container.getAttribute('data-accordion-open-one-at-a-time') === 'true';

    if (isCurrentlyOpen) {
      setItemState(item, false);
    } else {
      if (openOneAtATime) {
        const allItems = container.querySelectorAll('[data-el="accordion.item"]');
        allItems.forEach((sibling) => {
          if (sibling !== item) {
            setItemState(sibling, false);
          }
        });
      }
      setItemState(item, true);
    }
  };

  const initFaqAccordions = () => {
    ensureOverrideStyles();

    const containers = document.querySelectorAll('.faq-Page .faq-Faqs');
    if (!containers.length) return;

    containers.forEach((container) => {
      const items = container.querySelectorAll('[data-el="accordion.item"]');
      items.forEach((item) => {
        const isInitiallyOpen = item.getAttribute('aria-expanded') === 'true';
        const trigger = item.querySelector('[data-el="accordion.trigger"]');
        const body = item.querySelector('[data-el="accordion.body"]');

        if (body) {
          body.removeAttribute('style');
        }

        if (trigger) {
          trigger.setAttribute('role', 'button');
          trigger.setAttribute('tabindex', '0');
          trigger.setAttribute('aria-expanded', isInitiallyOpen ? 'true' : 'false');
        }
      });
    });
  };

  const handleTriggerAction = (target, event) => {
    const trigger = target.closest('.faq-Page [data-el="accordion.trigger"], .faq-Page .faq-Faqs_Header');
    if (!trigger) return;

    const item = trigger.closest('[data-el="accordion.item"]');
    if (!item) return;

    const container = item.closest('.faq-Faqs') || trigger.closest('.faq-Page');
    if (!container) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    toggleItem(item, container);
  };

  // Intercept trigger clicks during capture phase to prevent legacy theme scripts from triggering animations
  document.addEventListener(
    'click',
    (event) => {
      handleTriggerAction(event.target, event);
    },
    true
  );

  // Keyboard navigation for accessibility (Enter and Space)
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const trigger = event.target.closest('.faq-Page [data-el="accordion.trigger"]');
        if (trigger) {
          handleTriggerAction(event.target, event);
        }
      }
    },
    true
  );

  // Shopify Theme Editor support
  document.addEventListener('shopify:block:select', (event) => {
    const item = event.target.closest('[data-el="accordion.item"]');
    if (item && item.closest('.faq-Page')) {
      const container = item.closest('.faq-Faqs') || item.closest('.faq-Page');
      if (container && container.getAttribute('data-accordion-open-one-at-a-time') === 'true') {
        const allItems = container.querySelectorAll('[data-el="accordion.item"]');
        allItems.forEach((sibling) => {
          if (sibling !== item) setItemState(sibling, false);
        });
      }
      setItemState(item, true);
    }
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    const item = event.target.closest('[data-el="accordion.item"]');
    if (item && item.closest('.faq-Page')) {
      setItemState(item, false);
    }
  });

  document.addEventListener('shopify:section:load', () => {
    initFaqAccordions();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaqAccordions);
  } else {
    initFaqAccordions();
  }
})();

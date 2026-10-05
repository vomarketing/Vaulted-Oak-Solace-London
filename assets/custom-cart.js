if (!window.CartPageController) {
  class CartPageController {
    static selectors = {
      root: '[data-bag]',
      item: '[data-bag-item]',
      quantity: '[data-bag-quantity]',
      edit: '[data-bag-edit]',
      editToggle: '[data-bag-edit-toggle]',
      size: '[data-bag-size]',
      sizeVariant: '[data-bag-size-variant]',
      error: '[data-bag-error]',
      cartCount: '[data-push-cart-count]',
      cartEmpty: '[data-cart-empty]'
    };

    static classes = {
      isOpen: 'is-open',
      isLoading: 'is-loading',
      isBusy: 'is-busy'
    };

    constructor() {
      this.selectors = CartPageController.selectors;
      this.classes = CartPageController.classes;
      this.abortController = new AbortController();
      this.isBusy = false;

      this.bindEvents();
    }

    get root() {
      return document.querySelector(this.selectors.root);
    }

    get routesRoot() {
      return window.Shopify?.routes?.root || '/';
    }

    bindEvents() {
      const { signal } = this.abortController;

      document.addEventListener('click', (e) => this.onClick(e), { signal });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeSizeMenus(true);
      }, { signal });
    }

    onClick(e) {
      if (!e.target.closest(this.selectors.edit)) this.closeSizeMenus();

      const root = this.root;
      if (!root || !root.contains(e.target)) return;

      const item = e.target.closest(this.selectors.item);
      if (!item) return;

      const sizeButton = e.target.closest(this.selectors.sizeVariant);
      if (sizeButton) {
        if (sizeButton.hasAttribute('aria-current')) {
          this.closeSizeMenus(true);
        } else {
          this.changeVariant(item, sizeButton.dataset.bagSizeVariant);
        }
        return;
      }

      const editToggle = e.target.closest(this.selectors.editToggle);
      if (editToggle) {
        this.toggleSizeMenu(editToggle);
        return;
      }

      const quantityButton = e.target.closest(this.selectors.quantity);
      if (quantityButton) {
        this.changeQuantity(item, parseInt(quantityButton.dataset.bagQuantity, 10));
      }
    }

    /* Cart requests */

    async changeQuantity(item, quantity) {
      if (Number.isNaN(quantity) || quantity < 0) return;

      await this.request(item, async () => {
        const cart = await this.postCart('cart/change.js', {
          id: item.dataset.key,
          quantity,
          ...this.sectionsPayload()
        });

        this.render(cart);
      });
    }

    async changeVariant(item, variantId) {
      if (!variantId) return;

      const quantity = parseInt(item.dataset.quantity, 10) || 1;
      let properties = {};
      try {
        const parsed = JSON.parse(item.dataset.properties || '{}');
        // Liquid serialises empty properties as [], which cart/add.js rejects.
        if (parsed && !Array.isArray(parsed)) properties = parsed;
      } catch (error) {
        properties = {};
      }

      this.closeSizeMenus();

      await this.request(item, async () => {
        await this.postCart('cart/add.js', {
          items: [{ id: Number(variantId), quantity, properties }]
        });

        const cart = await this.postCart('cart/change.js', {
          id: item.dataset.key,
          quantity: 0,
          ...this.sectionsPayload()
        });

        this.render(cart);
      });
    }

    async request(item, callback) {
      if (this.isBusy) return;

      this.isBusy = true;
      this.root?.classList.add(this.classes.isBusy);
      item.classList.add(this.classes.isLoading);
      this.setError(item, '');

      try {
        await callback();
      } catch (error) {
        console.error('[Cart page]', error);
        item.classList.remove(this.classes.isLoading);
        this.setError(item, error.message || this.root?.dataset.errorMessage);
      } finally {
        this.isBusy = false;
        this.root?.classList.remove(this.classes.isBusy);
      }
    }

    async postCart(path, body) {
      const response = await fetch(`${this.routesRoot}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.description || data.message || this.root?.dataset.errorMessage);
      }

      return data;
    }

    sectionsPayload() {
      return {
        sections: [this.root.dataset.sectionId],
        sections_url: window.location.pathname
      };
    }

    render(cart) {
      const root = this.root;
      const html = cart.sections?.[root.dataset.sectionId];

      if (!html) {
        window.location.reload();
        return;
      }

      const nextRoot = new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(this.selectors.root);

      if (!nextRoot) {
        window.location.reload();
        return;
      }

      root.replaceWith(nextRoot);

      this.updateCartCount(cart.item_count);

      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    }

    updateCartCount(count) {
      document.querySelectorAll(this.selectors.cartCount).forEach((el) => {
        el.textContent = count;
      });

      document.querySelectorAll(this.selectors.cartEmpty).forEach((el) => {
        el.dataset.cartEmpty = count === 0 ? 'true' : 'false';
      });
    }

    setError(item, message) {
      const error = item.querySelector(this.selectors.error);
      if (!error) return;

      error.textContent = message || '';
      error.hidden = !message;
    }

    /* Change size dropdown */

    toggleSizeMenu(toggle) {
      const edit = toggle.closest(this.selectors.edit);
      const menu = edit?.querySelector(this.selectors.size);
      if (!menu) return;

      const willOpen = menu.hidden;
      this.closeSizeMenus();
      if (!willOpen) return;

      menu.hidden = false;
      edit.classList.add(this.classes.isOpen);
      toggle.setAttribute('aria-expanded', 'true');

      const focusTarget = menu.querySelector('[aria-current]') || menu.querySelector('button:not([disabled])');
      focusTarget?.focus({ preventScroll: true });
    }

    closeSizeMenus(restoreFocus = false) {
      document.querySelectorAll(`${this.selectors.edit}.${this.classes.isOpen}`).forEach((edit) => {
        const menu = edit.querySelector(this.selectors.size);
        const toggle = edit.querySelector(this.selectors.editToggle);

        edit.classList.remove(this.classes.isOpen);
        if (menu) menu.hidden = true;
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
          if (restoreFocus) toggle.focus({ preventScroll: true });
        }
      });
    }
  }

  window.CartPageController = CartPageController;

  const initCartPage = () => {
    if (!window.cartPageInstance) {
      window.cartPageInstance = new CartPageController();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPage);
  } else {
    initCartPage();
  }
}

if (!window.SLWishlist) {
  // --- Constants ---

  const IWISH_KEY = 'iWishlistmain';
  const IWISH_COUNT_KEY = 'iWishCnt';
  const IWISH_SYNC_KEY = 'iWishsync';
  const META_KEY = 'slWishlistMeta';
  const UNAVAILABLE_KEY = 'slWishlistUnavailable';
  const IWISH_TIMEOUT = 15000;
  const IWISH_SYNC_TIMEOUT = 10000;
  const STOREFRONT_API_VERSION = '2025-07';
  const CHANGE_EVENT = 'wishlist:change';
  const SKELETON_COUNT = 3;

  const HANDLES_QUERY = `
    query WishlistHandles($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product { id handle }
      }
    }
  `;

  // --- Helpers ---

  const readJSON = (key, fallback, storage = 'localStorage') => {
    try {
      const value = JSON.parse(window[storage].getItem(key));
      return value && typeof value === 'object' ? value : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeJSON = (key, value, storage = 'localStorage') => {
    try {
      window[storage].setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('[Wishlist]', error);
    }
  };

  const routesRoot = () => (window.Shopify?.routes?.root || '/').replace(/\/?$/, '/');

  // --- Store ---

  // iWish stores { productId: [variantId] } only; handle and "size chosen" live in META_KEY.
  class WishlistStore {
    constructor() {
      this.meta = readJSON(META_KEY, {});
      this.queue = Promise.resolve();
      this.iwishReady = this.waitForIWish();
      // Kept in iWish so restored products return; rechecked each session.
      this.unavailable = new Set(readJSON(UNAVAILABLE_KEY, [], 'sessionStorage').map(String));

      // True while iWish fetches a logged-in customer's wishlist for the first time on this device.
      this.syncing = this.isSyncPending();

      // Called by iWish after merging a logged-in customer's wishlist.
      const previousSyncFn = window.iWishsyncFn;
      window.iWishsyncFn = (...args) => {
        if (typeof previousSyncFn === 'function') previousSyncFn(...args);
        this.syncing = false;
        this.emit();
      };

      this.iwishReady.then((isLoaded) => {
        if (!isLoaded) this.syncing = false;
        if (this.syncing) setTimeout(() => this.stopSyncing(), IWISH_SYNC_TIMEOUT);
        this.emit();
      });

      window.addEventListener('storage', (e) => {
        if (e.key !== IWISH_KEY && e.key !== META_KEY) return;

        this.meta = readJSON(META_KEY, {});
        if (this.isIWishLoaded()) {
          window.iWishlistmain = readJSON(IWISH_KEY, {});
          window.iWishCnt = parseInt(localStorage.getItem(IWISH_COUNT_KEY), 10) || 0;
        }
        this.emit();
      });
    }

    // Public API

    get data() {
      const live = window.iWishlistmain;
      if (this.isIWishLoaded() && live && typeof live === 'object') return live;
      return readJSON(IWISH_KEY, {});
    }

    items() {
      const data = this.data;

      return Object.keys(data)
        .filter((productId) => Array.isArray(data[productId]) && data[productId].length > 0)
        .filter((productId) => !this.unavailable.has(productId))
        .map((productId, index) => {
          const variants = data[productId];
          const meta = this.meta[productId] || {};

          return {
            productId,
            variantId: String(variants[variants.length - 1]),
            handle: meta.handle || '',
            sized: meta.sized !== false,
            addedAt: meta.addedAt || 0,
            index
          };
        })
        .sort((a, b) => b.addedAt - a.addedAt || a.index - b.index);
    }

    count() {
      return this.items().length;
    }

    has(productId) {
      const variants = this.data[String(productId)];
      return Array.isArray(variants) && variants.length > 0;
    }

    add(productId, variantId, { handle = '', sized = true } = {}) {
      productId = String(productId || '');
      variantId = String(variantId || '');
      if (!productId || !variantId) return Promise.resolve();

      return this.enqueue(() => {
        this.setMeta(productId, { handle, sized, addedAt: Date.now() });
        this.replaceVariant(productId, variantId);
      });
    }

    setVariant(productId, variantId) {
      productId = String(productId || '');
      variantId = String(variantId || '');
      if (!productId || !variantId) return Promise.resolve();

      return this.enqueue(() => {
        this.setMeta(productId, { sized: true });
        this.replaceVariant(productId, variantId);
      });
    }

    remove(productId) {
      productId = String(productId || '');
      if (!productId) return Promise.resolve();

      return this.enqueue(() => {
        const variants = [...(this.data[productId] || [])];
        variants.forEach((variantId) => this.iwishRemove(productId, String(variantId)));

        delete this.meta[productId];
        writeJSON(META_KEY, this.meta);
      });
    }

    rememberHandle(productId, handle) {
      if (!handle) return;
      this.setMeta(String(productId), { handle });
    }

    markUnavailable(productIds) {
      const added = productIds.map(String).filter((productId) => !this.unavailable.has(productId));
      if (!added.length) return;

      added.forEach((productId) => this.unavailable.add(productId));
      writeJSON(UNAVAILABLE_KEY, [...this.unavailable], 'sessionStorage');
      this.emit();
    }

    // Queue + metadata

    enqueue(operation) {
      this.queue = this.queue
        .then(() => this.iwishReady)
        .then(operation)
        .catch((error) => console.error('[Wishlist]', error))
        .then(() => this.emit());

      return this.queue;
    }

    setMeta(productId, values) {
      const current = this.meta[productId] || {};
      const next = { ...current, ...values };
      if (!next.handle) next.handle = current.handle || '';

      this.meta[productId] = next;
      writeJSON(META_KEY, this.meta);
    }

    replaceVariant(productId, variantId) {
      [...(this.data[productId] || [])]
        .map(String)
        .filter((id) => id !== variantId)
        .forEach((id) => this.iwishRemove(productId, id));

      this.iwishAdd(productId, variantId);
    }

    // iWish bridge

    isSyncPending() {
      try {
        return parseInt(window.iwish_cid, 10) > 0 && localStorage.getItem(IWISH_SYNC_KEY) !== 'true';
      } catch (error) {
        return false;
      }
    }

    // iWish never calls iWishsyncFn if its sync request fails.
    stopSyncing() {
      if (!this.syncing) return;

      this.syncing = false;
      this.emit();
    }

    isIWishLoaded() {
      return typeof window.iwish_addOnly === 'function'
        && typeof window.iwish_remove === 'function'
        && typeof window.jQuery === 'function';
    }

    waitForIWish() {
      return new Promise((resolve) => {
        const startedAt = Date.now();

        const check = () => {
          if (this.isIWishLoaded()) {
            resolve(true);
          } else if (Date.now() - startedAt > IWISH_TIMEOUT) {
            resolve(false);
          } else {
            setTimeout(check, 200);
          }
        };

        check();
      });
    }

    iwishAdd(productId, variantId) {
      if (this.isIWishLoaded()) {
        window.iwish_addOnly(productId, variantId, window.jQuery('<div>'), 0);
        return;
      }

      const data = readJSON(IWISH_KEY, {});
      data[productId] = data[productId] || [];
      if (!data[productId].includes(variantId)) data[productId].push(variantId);
      this.writeIWishFallback(data);
    }

    iwishRemove(productId, variantId) {
      if (this.isIWishLoaded()) {
        window.iwish_remove(window.jQuery('<div>'), productId, variantId, true);
        return;
      }

      const data = readJSON(IWISH_KEY, {});
      if (!Array.isArray(data[productId])) return;

      data[productId] = data[productId].filter((id) => String(id) !== variantId);
      if (!data[productId].length) delete data[productId];
      this.writeIWishFallback(data);
    }

    writeIWishFallback(data) {
      const total = Object.values(data)
        .reduce((sum, variants) => sum + (Array.isArray(variants) ? variants.length : 0), 0);

      writeJSON(IWISH_KEY, data);
      localStorage.setItem(IWISH_COUNT_KEY, String(total));
    }

    emit() {
      document.dispatchEvent(new CustomEvent(CHANGE_EVENT, {
        detail: { items: this.items() }
      }));
    }
  }

  const store = new WishlistStore();
  window.SLWishlist = store;

  // --- Elements ---

  class WishlistElement extends HTMLElement {
    connectedCallback() {
      this.abortController = new AbortController();
      document.addEventListener(CHANGE_EVENT, () => this.sync(), { signal: this.abortController.signal });
      this.sync();
    }

    disconnectedCallback() {
      this.abortController?.abort();
    }

    sync() {}
  }

  class WishlistToggle extends WishlistElement {
    static selectors = {
      button: 'button',
      buyButtons: 'product-buy-buttons',
      masterSelect: '.js-pdp-master-select',
      selectedSize: '.js-pdp-size-btn[aria-pressed="true"]'
    };

    static classes = {
      isActive: 'is-active'
    };

    constructor() {
      super();
      this.selectors = WishlistToggle.selectors;
      this.classes = WishlistToggle.classes;
    }

    connectedCallback() {
      this.button = this.querySelector(this.selectors.button);
      if (!this.button) return;

      super.connectedCallback();
      this.button.addEventListener('click', () => this.toggle(), { signal: this.abortController.signal });
    }

    toggle() {
      const { productId } = this.dataset;
      if (!productId) return;

      const isSaved = this.button.getAttribute('aria-pressed') === 'true';
      const cartItem = this.closest('[data-mini-item]');
      const shouldStaySaved = isSaved && !!cartItem;
      document.querySelectorAll(`wishlist-toggle[data-product-id="${productId}"]`).forEach((toggle) => {
        toggle.setPressed?.(shouldStaySaved || !isSaved);
      });

      if (isSaved) {
        // A cart-row bookmark always means "move to saved", even if this
        // product was already saved and the two lists had become duplicated.
        if (cartItem) {
          this.moveCartItemToWishlist(productId, this.resolveSelection().variantId, true, cartItem);
          return;
        }
        store.remove(productId);
        return;
      }

      const { variantId, sized } = this.resolveSelection();
      if (cartItem) {
        this.moveCartItemToWishlist(productId, variantId, sized, cartItem);
        return;
      }

      store.add(productId, variantId, { handle: this.dataset.productHandle, sized });
    }

    async moveCartItemToWishlist(productId, variantId, sized, cartItem) {
      const wasSaved = store.has(productId);
      if (!wasSaved) {
        await store.add(productId, variantId, { handle: this.dataset.productHandle, sized });
      }

      const removed = await window.SLMiniBag?.removeItem(cartItem.dataset.key);
      if (removed !== true && !wasSaved) await store.remove(productId);
    }

    resolveSelection() {
      let variantId = this.dataset.variantId;
      let sized = this.dataset.sized !== 'false';
      if (this.dataset.source !== 'pdp') return { variantId, sized };

      const buyButtons = document.querySelector(
        `${this.selectors.buyButtons}[data-product-id="${this.dataset.productId}"]`
      );

      // Mobile resets data-size-chosen after adding to bag, but the size stays selected.
      const selectedSize = buyButtons?.querySelector(this.selectors.selectedSize);
      if (selectedSize?.dataset.variantId) {
        variantId = selectedSize.dataset.variantId;
        sized = true;
      } else if (buyButtons) {
        const selectedVariant = buyButtons.querySelector(this.selectors.masterSelect)?.value;
        sized = buyButtons.dataset.sizeChosen === 'true';
        if (sized && selectedVariant) variantId = selectedVariant;
      }

      return { variantId, sized };
    }

    setPressed(isPressed) {
      if (!this.button) return;

      this.button.setAttribute('aria-pressed', String(isPressed));
      this.button.classList.toggle(this.classes.isActive, isPressed);
    }

    sync() {
      this.setPressed(store.has(this.dataset.productId));
    }
  }

  class WishlistCount extends WishlistElement {
    sync() {
      this.textContent = store.count();
    }
  }

  class WishlistIndicator extends WishlistElement {
    sync() {
      this.dataset.filled = String(store.count() > 0);
    }
  }

  // Markup comes from product.wishlist.liquid.
  class WishlistItem extends HTMLElement {
    static selectors = {
      panel: 'wishlist-panel',
      size: '[data-wishlist-size]',
      sizeToggle: '[data-wishlist-size-toggle]',
      sizeMenu: '[data-wishlist-size-menu]',
      sizeOption: '[data-wishlist-size-variant]',
      sizeLabel: '[data-wishlist-size-label]',
      variantInput: '[data-wishlist-variant-input]',
      remove: '[data-wishlist-remove]',
      add: '[data-wishlist-add]',
      error: '[data-wishlist-error]'
    };

    static classes = {
      isOpen: 'is-open',
      isLoading: 'is-loading'
    };

    constructor() {
      super();
      this.selectors = WishlistItem.selectors;
      this.classes = WishlistItem.classes;
    }

    connectedCallback() {
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      this.addEventListener('click', (e) => this.onClick(e), { signal });
      this.addEventListener('submit', (e) => this.onSubmit(e), { signal });
    }

    disconnectedCallback() {
      this.abortController?.abort();
    }

    get productId() {
      return this.dataset.productId;
    }

    get variantId() {
      return this.dataset.variantId;
    }

    // Render

    update({ variantId, sized }) {
      this.classList.remove(this.classes.isLoading);
      this.dataset.variantId = variantId;

      const hasSizes = !!this.querySelector(this.selectors.size);
      this.dataset.sized = String(sized || !hasSizes);

      const input = this.querySelector(this.selectors.variantInput);
      if (input) input.value = variantId;

      let currentLabel = '';
      this.querySelectorAll(this.selectors.sizeOption).forEach((option) => {
        const isCurrent = sized && option.dataset.wishlistSizeVariant === variantId;
        if (isCurrent) {
          option.setAttribute('aria-current', 'true');
          currentLabel = option.dataset.label;
        } else {
          option.removeAttribute('aria-current');
        }
      });

      const label = this.querySelector(this.selectors.sizeLabel);
      if (label) label.textContent = currentLabel || label.dataset.placeholder;

      const add = this.querySelector(this.selectors.add);
      if (add) {
        const isAvailable = this.isAvailable(variantId, sized);
        add.disabled = !isAvailable;
        add.textContent = isAvailable ? add.dataset.labelAdd : add.dataset.labelSoldOut;
      }
    }

    isAvailable(variantId, sized) {
      if (this.dataset.productAvailable !== 'true') return false;
      if (!sized) return true;

      const option = [...this.querySelectorAll(this.selectors.sizeOption)]
        .find((el) => el.dataset.wishlistSizeVariant === variantId);
      if (option) return !option.disabled;

      return this.dataset.variantAvailable === 'true';
    }

    // Events

    onClick(e) {
      const option = e.target.closest(this.selectors.sizeOption);
      if (option) {
        this.selectSize(option);
        return;
      }

      if (e.target.closest(this.selectors.sizeToggle)) {
        if (this.querySelector(this.selectors.sizeMenu)?.hidden) {
          this.openSizeMenu();
        } else {
          this.closeSizeMenu(true);
        }
        return;
      }

      if (e.target.closest(this.selectors.remove)) {
        this.classList.add(this.classes.isLoading);
        store.remove(this.productId);
      }
    }

    onSubmit(e) {
      if (this.dataset.sized === 'true') return;

      // Stop the mini bag's document-level submit handler until a size is chosen.
      e.preventDefault();
      e.stopPropagation();
      this.openSizeMenu();
    }

    // Size menu

    selectSize(option) {
      if (option.disabled) return;

      const variantId = option.dataset.wishlistSizeVariant;
      this.closeSizeMenu(true);
      this.setError('');
      this.update({ variantId, sized: true });
      store.setVariant(this.productId, variantId);
    }

    openSizeMenu() {
      const menu = this.querySelector(this.selectors.sizeMenu);
      if (!menu) return;

      this.closest(this.selectors.panel)?.closeSizeMenus();
      menu.hidden = false;
      this.querySelector(this.selectors.size)?.classList.add(this.classes.isOpen);
      this.querySelector(this.selectors.sizeToggle)?.setAttribute('aria-expanded', 'true');

      const focusTarget = menu.querySelector('[aria-current="true"]')
        || menu.querySelector('button:not([disabled])');
      focusTarget?.focus({ preventScroll: true });
    }

    closeSizeMenu(restoreFocus = false) {
      const menu = this.querySelector(this.selectors.sizeMenu);
      if (!menu || menu.hidden) return;

      menu.hidden = true;
      this.querySelector(this.selectors.size)?.classList.remove(this.classes.isOpen);

      const toggle = this.querySelector(this.selectors.sizeToggle);
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        if (restoreFocus) toggle.focus({ preventScroll: true });
      }
    }

    setError(message) {
      const error = this.querySelector(this.selectors.error);
      if (!error) return;

      error.textContent = message;
      error.hidden = !message;
    }
  }

  class WishlistPanel extends WishlistElement {
    static selectors = {
      drawer: '[data-mini-bag]',
      list: '[data-wishlist-list]',
      empty: '[data-wishlist-empty]',
      skeleton: '[data-wishlist-skeleton]',
      skeletonItem: '.wsl-Skeleton',
      item: 'wishlist-item',
      size: '[data-wishlist-size]',
      openSizeMenu: '[data-wishlist-size-menu]:not([hidden])'
    };

    static classes = {
      drawerActive: 'drw-Drawer-active'
    };

    constructor() {
      super();
      this.selectors = WishlistPanel.selectors;
      this.classes = WishlistPanel.classes;
      this.cache = new Map();
      this.unresolved = new Set();
      this.sequence = 0;
      this.dirty = true;
    }

    connectedCallback() {
      this.drawer = this.closest(this.selectors.drawer);
      this.list = this.querySelector(this.selectors.list);
      this.empty = this.querySelector(this.selectors.empty);
      this.skeleton = this.querySelector(this.selectors.skeleton);
      if (!this.list || !this.empty) return;

      super.connectedCallback();
      this.bindEvents();
    }

    get isVisible() {
      return !this.hidden && !!this.drawer?.classList.contains(this.classes.drawerActive);
    }

    get items() {
      return [...this.list.querySelectorAll(this.selectors.item)];
    }

    bindEvents() {
      const { signal } = this.abortController;

      document.addEventListener('mini-bag:tab', () => {
        if (this.isVisible && this.dirty) this.render();
      }, { signal });

      document.addEventListener('mini-bag:added', (e) => {
        const item = e.detail?.form?.closest(this.selectors.item);
        if (item && this.contains(item)) store.remove(item.productId);
      }, { signal });

      document.addEventListener('click', (e) => {
        if (!e.target.closest(this.selectors.size)) this.closeSizeMenus();
      }, { signal });

      // Runs before the mini bag's Escape handler, which closes the whole drawer.
      window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !this.querySelector(this.selectors.openSizeMenu)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        this.closeSizeMenus(true);
      }, { capture: true, signal });
    }

    sync() {
      this.syncEmptyState();
      this.dirty = true;
      if (this.isVisible) this.render();
    }

    syncEmptyState() {
      const isEmpty = store.count() === 0;
      const isLoading = isEmpty && store.syncing;
      this.drawer?.setAttribute('data-saved-empty', String(isEmpty && !isLoading));
      if (!isEmpty) return;

      this.empty.hidden = isLoading;
      this.toggleAttribute('aria-busy', isLoading);
      if (isLoading) {
        this.showSkeleton();
      } else {
        this.list.replaceChildren();
      }
    }

    showSkeleton(count = SKELETON_COUNT) {
      if (!this.skeleton || this.list.querySelector(this.selectors.skeletonItem)) return;

      const nodes = Array.from(
        { length: Math.min(count, SKELETON_COUNT) },
        () => this.skeleton.content.cloneNode(true)
      );
      this.list.replaceChildren(...nodes);
    }

    closeSizeMenus(restoreFocus = false) {
      this.items.forEach((item) => item.closeSizeMenu?.(restoreFocus));
    }

    // Render

    async render() {
      this.dirty = false;
      const sequence = ++this.sequence;
      const items = store.items();

      if (!items.length) {
        this.syncEmptyState();
        return;
      }

      this.empty.hidden = true;
      this.setAttribute('aria-busy', 'true');
      if (!this.items.length) this.showSkeleton(items.length);

      try {
        await this.resolveHandles(items);
        const nodes = await Promise.all(items.map((item) => this.buildItem(item)));

        if (sequence === this.sequence) {
          const visibleNodes = nodes.filter(Boolean);
          this.list.replaceChildren(...visibleNodes);
          this.empty.hidden = visibleNodes.length > 0;
        }
      } finally {
        if (sequence === this.sequence) this.removeAttribute('aria-busy');
      }

      // Even for superseded renders: later renders skip handles already marked missing.
      const unavailableIds = items
        .filter((item) => item.isUnavailable)
        .map((item) => item.productId);
      store.markUnavailable(unavailableIds);
    }

    async resolveHandles(items) {
      const missing = items.filter((item) => !item.handle && !this.unresolved.has(item.productId));
      if (!missing.length) return;

      await this.resolveHandlesFromStorefront(items, missing);
      await this.resolveHandlesFromVariants(missing.filter((item) => !item.handle));

      missing
        .filter((item) => !item.handle)
        .forEach((item) => this.unresolved.add(item.productId));
    }

    async resolveHandlesFromStorefront(items, missing) {
      try {
        const response = await fetch(`${window.location.origin}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: HANDLES_QUERY,
            variables: { ids: missing.map((item) => `gid://shopify/Product/${item.productId}`) }
          })
        });
        const { data } = await response.json();

        (data?.nodes || []).forEach((node) => {
          if (!node?.handle) return;

          const productId = node.id.split('/').pop();
          store.rememberHandle(productId, node.handle);
          items
            .filter((item) => item.productId === productId)
            .forEach((item) => { item.handle = node.handle; });
        });
      } catch (error) {
        console.error('[Wishlist]', error);
      }
    }

    resolveHandlesFromVariants(items) {
      return Promise.all(items.map(async (item) => {
        const controller = new AbortController();

        try {
          const response = await fetch(`${routesRoot()}variants/${item.variantId}`, {
            credentials: 'same-origin',
            signal: controller.signal
          });
          controller.abort();

          const handle = new URL(response.url).pathname.match(/\/products\/([^/]+)/)?.[1];
          if (!handle) {
            item.isUnavailable = response.status === 404;
            return;
          }

          item.handle = decodeURIComponent(handle);
          store.rememberHandle(item.productId, item.handle);
        } catch (error) {
          console.error('[Wishlist]', error);
        }
      }));
    }

    async buildItem(item) {
      if (!item.handle) return null;

      let node = this.items.find((el) => el.productId === item.productId && el.variantId === item.variantId);

      if (!node) {
        const html = await this.fetchItem(item);
        if (html === null) {
          item.isUnavailable = true;
          return null;
        }

        const parsed = new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector(this.selectors.item);
        if (!parsed) return null;

        node = document.importNode(parsed, true);
        customElements.upgrade(node);
      }

      node.update(item);
      return node;
    }

    // Resolves to null when the product no longer exists in this market, '' on other failures.
    fetchItem(item) {
      const key = `${item.handle}|${item.variantId}`;
      if (this.cache.has(key)) return this.cache.get(key);

      const path = `${routesRoot()}products/${encodeURIComponent(item.handle)}`;
      const url = new URL(path, window.location.origin);
      url.searchParams.set('view', 'wishlist');
      url.searchParams.set('variant', item.variantId);

      const request = fetch(url, { credentials: 'same-origin' })
        .then((response) => {
          if (response.status === 404) return null;
          return response.ok ? response.text() : Promise.reject(new Error(response.statusText));
        })
        .catch((error) => {
          this.cache.delete(key);
          console.error('[Wishlist]', error);
          return '';
        });

      this.cache.set(key, request);
      return request;
    }
  }

  // --- Register ---

  customElements.define('wishlist-toggle', WishlistToggle);
  customElements.define('wishlist-count', WishlistCount);
  customElements.define('wishlist-indicator', WishlistIndicator);
  customElements.define('wishlist-item', WishlistItem);
  customElements.define('wishlist-panel', WishlistPanel);
}

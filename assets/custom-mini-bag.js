(() => {
  'use strict';
  function init() {
    const drawer = document.querySelector('[data-mini-bag]');
    if (!drawer || drawer.dataset.initialized) return;
    drawer.dataset.initialized = 'true';
    const root = (drawer.dataset.rootUrl || '/').replace(/\/?$/, '/');
    const section = 'mini-bag-content';
    const content = drawer.querySelector('[data-mini-content]');
    const info = drawer.querySelector('[data-mini-information]');
    const title = drawer.querySelector('#MiniBagTitle');
    const error = drawer.querySelector('[data-mini-error]');
    const live = drawer.querySelector('[data-mini-live]');
    let busy = false, opened = false, returnFocus = null, focusAfter = null;
    let inertElements = [], refreshSequence = 0;
    const isOpen = () => drawer.classList.contains('drw-Drawer-active');
    const showError = message => { error.textContent = message; error.hidden = !message; };
    const setBusy = value => {
      busy = value;
      drawer.setAttribute('aria-busy', String(value));
      drawer.querySelectorAll('.mbg-Checkout').forEach(el => { el.disabled = value; });
    };
    function setInfo(value) {
      info.hidden = !value; content.hidden = value;
      if (value) {
        title.textContent = 'Shipping & Returns';
        title.classList.add('MiniBagTitle--shipping');
      } else {
        sync();
        if (title.classList.contains('MiniBagTitle--shipping')) {
          title.classList.remove('MiniBagTitle--shipping');
        }
      }
      if (isOpen()) drawer.querySelector('[data-mini-close]').focus({preventScroll:true});
    }
    function sync() {
      const state = content.querySelector('[data-mini-state]');
      if (!state) return;
      const count = Number(state.dataset.count);
      drawer.dataset.empty = String(count === 0);
      if (info.hidden) {
        title.textContent = `Bag (${count})`;
      }
      document.querySelectorAll('[data-push-cart-count]').forEach(el => { el.textContent = count; });
      document.querySelectorAll('.hd-Nav_Cart,.hd-MobileNav_Cart').forEach(el => { el.dataset.cartEmpty = String(count === 0); });
      live.textContent = `Bag updated. ${count} item${count === 1 ? '' : 's'}.`;
    }
    function render(html) {
      if (typeof html !== 'string') return false;
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const state = parsed.querySelector('[data-mini-state]');
      if (!state) return false;
      const scrollTop = content.querySelector('.mbg-Scroll')?.scrollTop || 0;
      content.replaceChildren(document.importNode(state, true));
      sync();
      content.querySelector('.mbg-Scroll').scrollTop = scrollTop;
      if (isOpen() && focusAfter) {
        const item = [...content.querySelectorAll('[data-mini-item]')].find(el => el.dataset.key === focusAfter.key);
        (item?.querySelector(focusAfter.selector) || drawer.querySelector('[data-mini-close]')).focus({preventScroll:true});
      }
      return true;
    }
    async function readFresh() {
      const id = ++refreshSequence;
      const url = new URL(root, location.origin);
      url.searchParams.set('section_id', section);
      const response = await fetch(url, {credentials:'same-origin',cache:'no-store'});
      if (!response.ok) throw new Error('Unable to refresh your bag.');
      const html = await response.text();
      if (id !== refreshSequence) return;
      if (!render(html)) throw new Error('Unable to refresh your bag.');
    }
    async function mutate(endpoint, body, form) {
      if (busy) return;
      ++refreshSequence; setBusy(true); showError('');
      const submitButtons = form ? [...form.querySelectorAll('[type="submit"]')].map(el => [el,el.disabled]) : [];
      submitButtons.forEach(([el]) => { el.disabled = true; });
      let applied = false;
      try {
        const isForm = body instanceof FormData;
        if (isForm) { body.set('sections', section); body.set('sections_url', root); }
        else { body.sections = [section]; body.sections_url = root; }
        const response = await fetch(`${root}cart/${endpoint}.js`, {
          method:'POST',credentials:'same-origin',
          headers: isForm ? {'Accept':'application/json'} : {'Accept':'application/json','Content-Type':'application/json'},
          body: isForm ? body : JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.description === 'string' ? data.description : 'Unable to update your bag. Please check the quantity and try again.');
        applied = true;
        if (!render(data.sections?.[section])) await readFresh();
        if (endpoint === 'add') {
          returnFocus = form?.querySelector('[type="submit"]') || document.activeElement;
          const mega = document.querySelector('[data-mega-trigger][aria-expanded="true"]');
          if (mega) mega.click();
          if (window.drawers) window.drawers.activeDrawerKey = 'cart';
          else location.assign(`${root}cart`);
        }
        document.dispatchEvent(new CustomEvent('mini-bag:updated', {detail:{source:'mini-bag'}}));
      } catch (err) {
        // Never retry a cart mutation automatically: the server may have applied it.
        try { await readFresh(); } catch (_) { /* Keep the last known view. */ }
        const message = applied ? 'Your bag was updated, but the display could not refresh. Open View your cart to check it before adding again.' : (err.message || 'Unable to update your bag. Open your cart to check it before trying again.');
        if (!isOpen() && window.drawers) window.drawers.activeDrawerKey = 'cart';
        showError(message);
      } finally {
        setBusy(false); focusAfter = null;
        submitButtons.forEach(([el,disabled]) => { if (el.isConnected) el.disabled = disabled; });
      }
    }
    document.addEventListener('submit', event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches('[data-push-cart-form]')) return;
      event.preventDefault();
      if (busy) return;
      returnFocus = event.submitter || document.activeElement;
      const data = new FormData(form);
      if (!data.has('quantity') || data.get('quantity') === '') data.set('quantity','1');
      mutate('add',data,form);
    });
    drawer.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.matches('[data-mini-close]')) {
        if (!info.hidden) setInfo(false);
        else if (window.drawers) window.drawers.activeDrawerKey = '';
        return;
      }
      if (button.matches('[data-mini-info]')) { setInfo(true); return; }
      if (button.matches('[data-mini-tooltip-toggle]')) {
        const tooltip = drawer.querySelector('[data-mini-tooltip]');
        tooltip.hidden = !tooltip.hidden; button.setAttribute('aria-expanded',String(!tooltip.hidden)); return;
      }
      if (button.matches('[data-mini-step],[data-mini-remove]') && !busy) {
        const item = button.closest('[data-mini-item]');
        const remove = button.matches('[data-mini-remove]');
        const quantity = remove ? 0 : Number(item.dataset.quantity) + Number(button.dataset.miniStep);
        if (!remove && quantity < 1) return;
        focusAfter = {key:item.dataset.key,selector:remove ? '[data-mini-remove]' : `[data-mini-step="${button.dataset.miniStep}"]`};
        mutate('change',{id:item.dataset.key,quantity});
      }
    });
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-module-drawers-trigger="cart"]');
      if (trigger) returnFocus = trigger;
      const tooltip = drawer.querySelector('[data-mini-tooltip]');
      if (tooltip && !event.target.closest('.mbg-Shipping')) {
        tooltip.hidden = true; drawer.querySelector('[data-mini-tooltip-toggle]')?.setAttribute('aria-expanded','false');
      }
    }, true);
    function isolate(value) {
      if (!value) { inertElements.forEach(([el,previous]) => { el.inert = previous; }); inertElements = []; return; }
      let branch = drawer;
      while (branch.parentElement && branch !== document.body) {
        for (const sibling of branch.parentElement.children) {
          if (sibling === branch || sibling.matches('script,style,link,.js-Drawers_Backdrop')) continue;
          inertElements.push([sibling,sibling.inert]); sibling.inert = true;
        }
        branch = branch.parentElement;
      }
    }
    function onOpenChange() {
      const next = isOpen();
      if (next === opened) return;
      opened = next;
      drawer.setAttribute('aria-hidden',String(!next));
      document.querySelectorAll('[data-module-drawers-trigger="cart"]').forEach(el => {
        el.setAttribute('aria-controls','MiniBag'); el.setAttribute('aria-expanded',String(next)); el.setAttribute('aria-haspopup','dialog');
      });
      if (next) {
        if (!returnFocus || !returnFocus.isConnected) returnFocus = document.activeElement;
        isolate(true); drawer.querySelector('[data-mini-close]').focus({preventScroll:true});
        if (!busy) readFresh().catch(() => showError('Unable to refresh your bag. Please open View your cart.'));
      } else {
        isolate(false); info.hidden = true; content.hidden = false; sync();
        if (!window.drawers?.activeDrawerKey && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
      }
    }
    document.addEventListener('keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();event.stopImmediatePropagation();
        const tooltip = drawer.querySelector('[data-mini-tooltip]:not([hidden])');
        if (tooltip) { tooltip.hidden = true; const toggle=drawer.querySelector('[data-mini-tooltip-toggle]');toggle.setAttribute('aria-expanded','false');toggle.focus(); }
        else if (!info.hidden) setInfo(false);
        else if (window.drawers) window.drawers.activeDrawerKey = '';
      }
      if (event.key === 'Tab') {
        const focusable = [...drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[hidden],[inert]'));
        const first = focusable[0], last = focusable[focusable.length-1];
        if (!first) {event.preventDefault();drawer.focus();return;}
        if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {event.preventDefault();last.focus();}
        else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {event.preventDefault();first.focus();}
      }
    },true);
    new MutationObserver(onOpenChange).observe(drawer,{attributes:true,attributeFilter:['class']});
    const header = document.querySelector('.hd-Header');
    if (header) {
      const measure = () => drawer.style.setProperty('--mbg-header-height',`${Math.round(header.getBoundingClientRect().height)}px`);
      new ResizeObserver(measure).observe(header);measure();
    }
    document.addEventListener('mini-bag:refresh', () => { if (!busy) readFresh().catch(() => showError('Unable to refresh your bag.')); });
    sync();onOpenChange();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

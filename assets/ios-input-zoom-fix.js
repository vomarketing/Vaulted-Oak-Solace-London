/**
 * ios-input-zoom-fix.js
 * Temporarily locks viewport scale while a `.js-no-ios-zoom` field is
 * touched/focused, then restores the original viewport.
 */
(() => {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    ((/Macintosh/.test(ua) || navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  const SELECTOR = '.js-no-ios-zoom';
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;

  const ORIGINAL = viewport.getAttribute('content') || 'width=device-width, initial-scale=1';
  const LOCKED =
    ORIGINAL.replace(/,?\s*(maximum-scale|user-scalable)\s*=\s*[^,]+/gi, '') +
    ', maximum-scale=1';

  let restoreTimer = null;

  const applyViewport = (content) => {
    if (viewport.getAttribute('content') === content) return;
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = content;
    viewport.replaceWith(meta);
    viewport = meta;
  };

  const lock = () => {
    clearTimeout(restoreTimer);
    applyViewport(LOCKED);
  };

  const unlockLater = () => {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => applyViewport(ORIGINAL), 300);
  };

  const isTarget = (e) => e.target instanceof Element && e.target.closest(SELECTOR);

  document.addEventListener('touchstart', (e) => isTarget(e) && lock(), { passive: true, capture: true });
  document.addEventListener('pointerdown', (e) => isTarget(e) && lock(), { passive: true, capture: true });

  document.addEventListener('focusin', (e) => isTarget(e) && lock(), { passive: true });
  document.addEventListener('focusout', (e) => isTarget(e) && unlockLater(), { passive: true });
})();
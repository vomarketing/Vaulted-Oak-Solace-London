/**
 * ios-input-zoom-fix.js
 *
 * Prevents iOS Safari from auto-zooming when focusing inputs/selects
 * that have font-size < 16px.
 * Usage: Add class `js-no-ios-zoom` to any input, select, or textarea
 * that needs this fix. No JS changes required when adding new fields.
 *
 */
(() => {
  // Only apply on iOS Safari – other browsers handle font-size zoom correctly.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (!isIOS) return;

  const SELECTOR = '.js-no-ios-zoom';
  const VIEWPORT_NO_ZOOM = 'width=device-width, initial-scale=1, maximum-scale=1';
  const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1';

  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;

  document.addEventListener(
    'focusin',
    (e) => {
      if (e.target && e.target.matches(SELECTOR)) {
        viewport.setAttribute('content', VIEWPORT_NO_ZOOM);
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'focusout',
    (e) => {
      if (e.target && e.target.matches(SELECTOR)) {
        viewport.setAttribute('content', VIEWPORT_DEFAULT);
      }
    },
    { passive: true }
  );
})();

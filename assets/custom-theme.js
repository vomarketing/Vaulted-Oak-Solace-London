(() => {
  const ua = navigator.userAgent || '';
  const isMetaInApp = ua.includes('Instagram');
  let viewportFrame = null;
  let lastHeight = null;

  const setViewportHeight = () => {
    viewportFrame = null;
    const viewport = window.visualViewport;
    // Pinch zoom changes the visual viewport without changing the page layout.
    if (viewport && viewport.scale !== 1) return;

    const height = viewport?.height || window.innerHeight;
    if (!Number.isFinite(height) || height <= 0 || height === lastHeight) return;

    lastHeight = height;
    document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
  };

  const scheduleViewportHeight = () => {
    if (viewportFrame === null) {
      viewportFrame = window.requestAnimationFrame(setViewportHeight);
    }
  };

  if (isMetaInApp) {
    document.documentElement.classList.add('force-vh-fallback');
    setViewportHeight();
    window.addEventListener('resize', scheduleViewportHeight);
    window.addEventListener('pageshow', scheduleViewportHeight);
    window.visualViewport?.addEventListener('resize', scheduleViewportHeight);
    window.visualViewport?.addEventListener('scroll', scheduleViewportHeight);
  }
})();

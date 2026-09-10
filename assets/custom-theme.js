(() => {
  const ua = navigator.userAgent || '';
  const isMetaInApp = ua.includes('Instagram');

  const setViewportHeight = () => {
    const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  if (isMetaInApp) {
    document.documentElement.classList.add('force-vh-fallback');
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('resize', setViewportHeight);
  }
})();

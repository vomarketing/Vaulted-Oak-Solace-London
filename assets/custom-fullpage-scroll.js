if (!window.SolaceFullpageScroll) {
  class FullpageScrollController {
    constructor() {
      this.selectors = {
        container: '#MainContent',
        sections: '#MainContent > .shopify-section'
      };

      this.sections = [];
      this.currentIndex = 0;

      // --- Animation state ---
      this.isAnimating = false;
      this.animationRaf = null;
      this.animationStart = null;
      this.animationFrom = 0;
      this.animationTo = 0;

      // --- Swiper-matching config ---
      this.DURATION = 700;
      this.COOLDOWN = 800;
      this.lastAnimationEnd = 0;
      this.TOUCH_THRESHOLD = 40;
      this.WHEEL_THRESHOLD = 20;

      this._wheelAccum = 0;
      this._wheelResetTimer = null;

      this.touchStartY = 0;

      this.abortController = null;

      this.init();
    }

    _easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    _scrollTo(targetY) {
      if (this.animationRaf !== null) {
        cancelAnimationFrame(this.animationRaf);
        this.animationRaf = null;
      }

      const startY = window.scrollY;

      if (Math.abs(startY - targetY) < 2) {
        this._onAnimationComplete();
        return;
      }

      this.animationFrom = startY;
      this.animationTo = targetY;
      this.animationStart = null;

      const step = (timestamp) => {
        if (this.animationStart === null) {
          this.animationStart = timestamp;
        }

        const elapsed = timestamp - this.animationStart;
        const progress = Math.min(elapsed / this.DURATION, 1);
        const eased = this._easeOutCubic(progress);
        const current = this.animationFrom + (this.animationTo - this.animationFrom) * eased;

        window.scrollTo(0, current);

        if (progress < 1) {
          this.animationRaf = requestAnimationFrame(step);
        } else {
          this.animationRaf = null;
          window.scrollTo(0, this.animationTo);
          this._onAnimationComplete();
        }
      };

      this.animationRaf = requestAnimationFrame(step);
    }

    _onAnimationComplete() {
      this.isAnimating = false;
      this.lastAnimationEnd = performance.now();
      this.animationRaf = null;
    }

    init() {
      if (!document.body.classList.contains('template-index')) return;

      this.updateSections();
      if (this.sections.length <= 1) return;

      this.syncCurrentIndex();
      this.bindEvents();
    }

    updateSections() {
      const elements = document.querySelectorAll(this.selectors.sections);
      this.sections = Array.from(elements).filter((el) => {
        return el.offsetHeight > 50 && window.getComputedStyle(el).display !== 'none';
      });
    }

    syncCurrentIndex() {
      const scrollY = window.scrollY;
      let closestIndex = 0;
      let minDistance = Infinity;

      this.sections.forEach((section, index) => {
        const sectionTop = this._getAbsoluteTop(section);
        const distance = Math.abs(sectionTop - scrollY);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      this.currentIndex = closestIndex;
    }

    bindEvents() {
      this.destroy();
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      const handleWheel = (e) => {
        if (this.isAnimating) {
          e.preventDefault();
          return;
        }

        if (performance.now() - this.lastAnimationEnd < this.COOLDOWN) {
          e.preventDefault();
          return;
        }

        const delta = e.deltaY;
        if (Math.abs(delta) < 1) return;

        const isTrackpad = e.deltaMode === 0 && Math.abs(delta) < 50;

        if (isTrackpad) {
          clearTimeout(this._wheelResetTimer);
          this._wheelAccum += delta;
          this._wheelResetTimer = setTimeout(() => {
            this._wheelAccum = 0;
          }, 200);

          if (Math.abs(this._wheelAccum) < this.WHEEL_THRESHOLD) return;

          const direction = this._wheelAccum > 0 ? 1 : -1;
          this._wheelAccum = 0;
          clearTimeout(this._wheelResetTimer);

          e.preventDefault();
          this._navigate(direction);
        } else {
          e.preventDefault();
          this._navigate(delta > 0 ? 1 : -1);
        }
      };

      const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
          this.touchStartY = e.touches[0].clientY;
        }
      };

      const handleTouchEnd = (e) => {
        if (this.isAnimating) return;
        if (performance.now() - this.lastAnimationEnd < this.COOLDOWN) return;
        if (!this.touchStartY) return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = this.touchStartY - touchEndY;

        if (Math.abs(deltaY) > this.TOUCH_THRESHOLD) {
          this._navigate(deltaY > 0 ? 1 : -1);
        }

        this.touchStartY = 0;
      };

      const handleKey = (e) => {
        if (this.isAnimating) return;
        if (performance.now() - this.lastAnimationEnd < this.COOLDOWN) return;

        if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          e.preventDefault();
          this._navigate(1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          e.preventDefault();
          this._navigate(-1);
        }
      };

      const handleResize = () => {
        window.requestAnimationFrame(() => {
          this.updateSections();
          this.syncCurrentIndex();
        });
      };

      const handleShopifyChange = () => {
        this.updateSections();
        this.syncCurrentIndex();
      };

      window.addEventListener('wheel', handleWheel, { passive: false, signal });
      window.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
      window.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
      window.addEventListener('keydown', handleKey, { signal });
      window.addEventListener('resize', handleResize, { passive: true, signal });

      document.addEventListener('shopify:section:load', handleShopifyChange, { signal });
      document.addEventListener('shopify:section:reorder', handleShopifyChange, { signal });
      document.addEventListener('shopify:section:select', handleShopifyChange, { signal });
    }

    _navigate(direction) {
      const nextIndex = this.currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= this.sections.length) return;
      this.goToSection(nextIndex);
    }

    goToSection(index) {
      if (index < 0 || index >= this.sections.length) return;

      this.currentIndex = index;
      this.isAnimating = true;

      const target = this.sections[index];
      const targetY = this._getAbsoluteTop(target);
      this._scrollTo(targetY);
    }

    _getAbsoluteTop(el) {
      let top = 0;
      let node = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent;
      }
      return top;
    }

    destroy() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.animationRaf !== null) {
        cancelAnimationFrame(this.animationRaf);
        this.animationRaf = null;
      }
      clearTimeout(this._wheelResetTimer);
      this._wheelAccum = 0;
    }
  }

  window.SolaceFullpageScroll = FullpageScrollController;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new FullpageScrollController());
  } else {
    new FullpageScrollController();
  }
}


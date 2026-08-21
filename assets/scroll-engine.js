if (!window.ScrollEngine) {
  /**
   * ScrollEngine - Modern base class for fullpage and lock-and-scroll interactions.
   */
  class ScrollEngine {
    static config = {
      duration: 700,
      cooldown: 800,
      wheelThreshold: 20,
      touchThreshold: 40,
      boundaryTolerance: 15
    };

    static selectors = {
      defaultStops: '#MainContent > .shopify-section'
    };

    static classes = {
      scrollLocked: 'is-scroll-locked'
    };

    #isAnimating = false;
    #animationRaf = null;
    #animationStart = null;
    #animationFrom = 0;
    #animationTo = 0;
    #lastAnimationEnd = 0;
    #wheelAccum = 0;
    #wheelResetTimer = null;
    #touchStartY = 0;
    #abortController = null;

    constructor(customConfig = {}) {
      this.config = { ...ScrollEngine.config, ...customConfig };
      this._init();
    }

    getStops() {
      const elements = document.querySelectorAll(ScrollEngine.selectors.defaultStops);
      return Array.from(elements).filter(
        (el) => el.offsetHeight > 50 && window.getComputedStyle(el).display !== 'none'
      );
    }

    canActivate() {
      return document.body.hasAttribute('data-fullpage-scroll');
    }

    shouldBlockScroll(event) {
      if (document.body.classList.contains(ScrollEngine.classes.scrollLocked)) {
        return true;
      }
      return false;
    }

    _onInit() {
      this._bindEvents();
    }

    _onResize() {}

    _easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    _scrollTo(targetY) {
      if (this.#animationRaf !== null) {
        cancelAnimationFrame(this.#animationRaf);
        this.#animationRaf = null;
      }

      const startY = window.scrollY;
      if (Math.abs(startY - targetY) < 2) {
        this.#onAnimationComplete();
        return;
      }

      this.#isAnimating = true;
      this.#animationFrom = startY;
      this.#animationTo = targetY;
      this.#animationStart = null;

      const step = (timestamp) => {
        if (this.#animationStart === null) {
          this.#animationStart = timestamp;
        }

        const elapsed = timestamp - this.#animationStart;
        const progress = Math.min(elapsed / this.config.duration, 1);
        const eased = this._easeOutCubic(progress);
        const current = this.#animationFrom + (this.#animationTo - this.#animationFrom) * eased;

        window.scrollTo(0, current);

        if (progress < 1) {
          this.#animationRaf = requestAnimationFrame(step);
        } else {
          this.#animationRaf = null;
          window.scrollTo(0, this.#animationTo);
          this.#onAnimationComplete();
        }
      };

      this.#animationRaf = requestAnimationFrame(step);
    }

    #onAnimationComplete() {
      this.#isAnimating = false;
      this.#lastAnimationEnd = performance.now();
      this.#animationRaf = null;
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

    /* =========================================================
       Lock-and-Scroll Target Calculation
       ========================================================= */

    getCurrentStopIndex(stops) {
      if (!stops || !stops.length) return -1;

      const currentScrollY = window.scrollY;
      let currentIdx = 0;

      for (let i = 0; i < stops.length; i++) {
        const top = this._getAbsoluteTop(stops[i]);
        if (currentScrollY >= top - this.config.boundaryTolerance) {
          currentIdx = i;
        }
      }

      return currentIdx;
    }

    /**
     * Determines whether we should trigger a scroll-engine transition to another stop,
     * or return null to allow normal native scrolling within a tall asset / boundaries.
     *
     * @param {number} direction - +1 for down, -1 for up
     * @returns {number|null} targetStopIndex or null for normal browser scroll
     */
    getTargetStopIndex(direction) {
      const stops = this.getStops();
      if (!stops || !stops.length) return null;

      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const currentIdx = this.getCurrentStopIndex(stops);
      if (currentIdx < 0 || currentIdx >= stops.length) return null;

      const currentStop = stops[currentIdx];
      const stopTop = this._getAbsoluteTop(currentStop);
      const stopHeight = currentStop.offsetHeight;
      const stopBottom = stopTop + stopHeight;
      const viewportBottom = currentScrollY + windowHeight;
      const tolerance = this.config.boundaryTolerance;

      if (direction > 0) {
        if (stopHeight > windowHeight) {
          const isBottomVisible = viewportBottom >= stopBottom - tolerance;
          if (!isBottomVisible) {
            return null;
          }
        }

        if (currentIdx < stops.length - 1) {
          return currentIdx + 1;
        }

        return null;
      } else {
        if (stopHeight > windowHeight) {
          const isTopAligned = currentScrollY <= stopTop + tolerance;
          if (!isTopAligned) {
            return null;
          }
        }

        if (currentIdx > 0) {
          return currentIdx - 1;
        }

        return null;
      }
    }

    goToStop(stops, index, direction = 1) {
      if (!stops || index < 0 || index >= stops.length) return;

      const targetStop = stops[index];
      const targetTop = this._getAbsoluteTop(targetStop);
      const targetHeight = targetStop.offsetHeight;
      const windowHeight = window.innerHeight;

      let targetY = targetTop;

      if (direction < 0 && targetHeight > windowHeight) {
        targetY = targetTop + targetHeight - windowHeight;
      }

      this._scrollTo(targetY);
    }

    _bindEvents() {
      this.destroy();
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;

      const handleWheel = (e) => {
        if (this.shouldBlockScroll(e)) return;
        if (this.#isAnimating) {
          e.preventDefault();
          return;
        }

        const delta = e.deltaY;
        if (Math.abs(delta) < 1) return;

        const direction = delta > 0 ? 1 : -1;
        const targetStopIndex = this.getTargetStopIndex(direction);

        if (targetStopIndex === null) {
          return;
        }

        if (performance.now() - this.#lastAnimationEnd < this.config.cooldown) {
          e.preventDefault();
          return;
        }

        const isTrackpad = e.deltaMode === 0 && Math.abs(delta) < 50;

        if (isTrackpad) {
          clearTimeout(this.#wheelResetTimer);
          this.#wheelAccum += delta;
          this.#wheelResetTimer = setTimeout(() => {
            this.#wheelAccum = 0;
          }, 200);

          if (Math.abs(this.#wheelAccum) < this.config.wheelThreshold) return;

          this.#wheelAccum = 0;
          clearTimeout(this.#wheelResetTimer);

          e.preventDefault();
          this.goToStop(this.getStops(), targetStopIndex, direction);
        } else {
          e.preventDefault();
          this.goToStop(this.getStops(), targetStopIndex, direction);
        }
      };

      const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
          this.#touchStartY = e.touches[0].clientY;
        }
      };

      const handleTouchEnd = (e) => {
        if (this.#isAnimating) return;
        if (this.shouldBlockScroll(e)) return;
        if (!this.#touchStartY || !e.changedTouches || !e.changedTouches.length) return;

        const deltaY = this.#touchStartY - e.changedTouches[0].clientY;
        this.#touchStartY = 0;

        if (Math.abs(deltaY) <= this.config.touchThreshold) return;

        const direction = deltaY > 0 ? 1 : -1;
        const targetStopIndex = this.getTargetStopIndex(direction);

        if (targetStopIndex !== null) {
          if (performance.now() - this.#lastAnimationEnd < this.config.cooldown) return;
          this.goToStop(this.getStops(), targetStopIndex, direction);
        }
      };

      const handleKey = (e) => {
        if (this.#isAnimating) return;
        if (this.shouldBlockScroll(e)) return;

        let direction = 0;
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          direction = 1;
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          direction = -1;
        }

        if (direction === 0) return;

        const targetStopIndex = this.getTargetStopIndex(direction);
        if (targetStopIndex !== null) {
          if (performance.now() - this.#lastAnimationEnd < this.config.cooldown) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          this.goToStop(this.getStops(), targetStopIndex, direction);
        }
      };

      window.addEventListener('wheel', handleWheel, { passive: false, signal });
      window.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
      window.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
      window.addEventListener('keydown', handleKey, { signal });
      window.addEventListener('resize', () => window.requestAnimationFrame(() => this._onResize()), {
        passive: true,
        signal
      });
    }

    get abortSignal() {
      return this.#abortController ? this.#abortController.signal : null;
    }

    _init() {
      if (this.canActivate()) {
        this._onInit();
      }
    }

    destroy() {
      if (this.#abortController) {
        this.#abortController.abort();
        this.#abortController = null;
      }
      if (this.#animationRaf !== null) {
        cancelAnimationFrame(this.#animationRaf);
        this.#animationRaf = null;
      }
      clearTimeout(this.#wheelResetTimer);
      this.#wheelAccum = 0;
      this.#isAnimating = false;
    }
  }

  window.ScrollEngine = ScrollEngine;
}

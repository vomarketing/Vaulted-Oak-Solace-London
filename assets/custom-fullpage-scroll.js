if (!window.SolaceFullpageScroll) {
  class FullpageScrollController {
    constructor() {
      this.selectors = {
        container: '#MainContent',
        sections: '#MainContent > .shopify-section'
      };

      this.classes = {
        isLocked: 'is-scroll-locked'
      };

      this.sections = [];
      this.currentIndex = 0;
      this.isAnimating = false;
      this.lastAnimationTime = 0;
      this.touchStartY = 0;
      this.abortController = null;
      this.unlockTimeout = null;

      this.init();
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
        const top = section.getBoundingClientRect().top + scrollY;
        const distance = Math.abs(top - scrollY);
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
        const now = performance.now();
        if (this.isAnimating || now - this.lastAnimationTime < 800) {
          e.preventDefault();
          return;
        }

        const delta = e.deltaY;
        if (Math.abs(delta) < 20) return;

        if (delta > 0) {
          if (this.currentIndex < this.sections.length - 1) {
            e.preventDefault();
            this.goToSection(this.currentIndex + 1);
          }
        } else {
          if (this.currentIndex > 0) {
            e.preventDefault();
            this.goToSection(this.currentIndex - 1);
          }
        }
      };

      const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
          this.touchStartY = e.touches[0].clientY;
        }
      };

      const handleTouchEnd = (e) => {
        const now = performance.now();
        if (this.isAnimating || now - this.lastAnimationTime < 800 || !this.touchStartY) return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = this.touchStartY - touchEndY;

        if (Math.abs(deltaY) > 40) {
          if (deltaY > 0 && this.currentIndex < this.sections.length - 1) {
            this.goToSection(this.currentIndex + 1);
          } else if (deltaY < 0 && this.currentIndex > 0) {
            this.goToSection(this.currentIndex - 1);
          }
        }

        this.touchStartY = 0;
      };

      const handleKey = (e) => {
        const now = performance.now();
        if (this.isAnimating || now - this.lastAnimationTime < 800) return;

        if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          if (this.currentIndex < this.sections.length - 1) {
            e.preventDefault();
            this.goToSection(this.currentIndex + 1);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          if (this.currentIndex > 0) {
            e.preventDefault();
            this.goToSection(this.currentIndex - 1);
          }
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

      const handleScrollEnd = () => {
        this.isAnimating = false;
        clearTimeout(this.unlockTimeout);
      };

      window.addEventListener('wheel', handleWheel, { passive: false, signal });
      window.addEventListener('touchstart', handleTouchStart, { passive: true, signal });
      window.addEventListener('touchend', handleTouchEnd, { passive: true, signal });
      window.addEventListener('keydown', handleKey, { signal });
      window.addEventListener('resize', handleResize, { passive: true, signal });

      if ('onscrollend' in window) {
        window.addEventListener('scrollend', handleScrollEnd, { passive: true, signal });
      }

      document.addEventListener('shopify:section:load', handleShopifyChange, { signal });
      document.addEventListener('shopify:section:reorder', handleShopifyChange, { signal });
      document.addEventListener('shopify:section:select', handleShopifyChange, { signal });
    }

    goToSection(index) {
      if (index < 0 || index >= this.sections.length) return;

      this.isAnimating = true;
      this.lastAnimationTime = performance.now();
      this.currentIndex = index;

      const target = this.sections[index];
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      clearTimeout(this.unlockTimeout);
      this.unlockTimeout = setTimeout(() => {
        this.isAnimating = false;
      }, 750);
    }

    destroy() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      if (this.unlockTimeout) {
        clearTimeout(this.unlockTimeout);
        this.unlockTimeout = null;
      }
    }
  }

  window.SolaceFullpageScroll = FullpageScrollController;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new FullpageScrollController());
  } else {
    new FullpageScrollController();
  }
}

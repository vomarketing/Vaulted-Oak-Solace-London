/**
 * Legal Content Component (<legal-content>)
 */

if (!customElements.get('legal-content')) {
  class LegalContent extends HTMLElement {
    static selectors = {
      tocLinks: '.legal-content__toc-link',
      sections: '[data-legal-section]',
      select: '.legal-content__select',
      dropdownWrapper: '.legal-content__dropdown-wrapper',
      tocContainer: '.legal-content__toc'
    };

    static classes = {
      active: 'is-active'
    };

    constructor() {
      super();
      this.abortController = null;
      this.layoutMode = 'sidebar';
      this.tocLinks = [];
      this.sections = [];
      this.selectEl = null;
    }

    connectedCallback() {
      this.abortController = new AbortController();
      this.layoutMode = this.getAttribute('data-layout') || 'sidebar';

      const rawTocLinks = this.querySelectorAll(LegalContent.selectors.tocLinks);
      this.tocLinks = rawTocLinks ? Array.from(rawTocLinks) : [];

      const rawSections = this.querySelectorAll(LegalContent.selectors.sections);
      this.sections = rawSections ? Array.from(rawSections) : [];

      this.selectEl = this.querySelector(LegalContent.selectors.select);

      if (!this.sections || this.sections.length === 0) return;

      this.bindEvents();

      if (this.layoutMode === 'sidebar') {
        this.handleInitialHash();
      }
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.tocLinks = [];
      this.sections = [];
      this.selectEl = null;
    }

    bindEvents() {
      if (!this.abortController) return;
      const { signal } = this.abortController;

      if (this.layoutMode === 'sidebar') {
        // Desktop TOC clicks
        this.addEventListener(
          'click',
          (event) => {
            if (!event || !event.target) return;
            const link = event.target.closest(LegalContent.selectors.tocLinks);
            if (!link || !this.contains(link)) return;

            event.preventDefault();
            const targetId = link.getAttribute('data-target') || (link.getAttribute('href') || '').replace(/^#/, '');
            if (targetId) {
              this.activateSection(targetId);
            }
          },
          { signal }
        );

        // Mobile & Tablet Select dropdown change
        if (this.selectEl) {
          this.selectEl.addEventListener(
            'change',
            (event) => {
              if (!event || !event.target) return;
              const targetId = event.target.value;
              if (targetId) {
                this.activateSection(targetId, true);
              }
            },
            { signal }
          );
        }

        const tocContainer = this.querySelector(LegalContent.selectors.tocContainer);
        if (tocContainer && this.tocLinks && this.tocLinks.length > 0) {
          tocContainer.addEventListener(
            'keydown',
            (event) => {
              if (!event) return;
              const activeEl = document.activeElement;
              const currentIndex = this.tocLinks.indexOf(activeEl);
              if (currentIndex === -1) return;

              let nextIndex = -1;
              const count = this.tocLinks.length;

              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault();
                nextIndex = (currentIndex + 1) % count;
              } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault();
                nextIndex = (currentIndex - 1 + count) % count;
              } else if (event.key === 'Home') {
                event.preventDefault();
                nextIndex = 0;
              } else if (event.key === 'End') {
                event.preventDefault();
                nextIndex = count - 1;
              }

              if (nextIndex !== -1 && this.tocLinks[nextIndex]) {
                const nextLink = this.tocLinks[nextIndex];
                nextLink.focus();
                const targetId = nextLink.getAttribute('data-target') || (nextLink.getAttribute('href') || '').replace(/^#/, '');
                if (targetId) {
                  this.activateSection(targetId);
                }
              }
            },
            { signal }
          );
        }

        // URL hashchange listener
        window.addEventListener(
          'hashchange',
          () => {
            this.handleInitialHash();
          },
          { signal }
        );
      }
    }

    activateSection(targetId, fromDropdown = false) {
      if (!targetId || typeof targetId !== 'string') return;
      const cleanId = targetId.replace(/^#/, '').trim();
      if (!cleanId || !this.sections || this.sections.length === 0) return;

      let targetSection = null;

      this.sections.forEach((section) => {
        if (!section) return;
        const sectionId = section.getAttribute('data-anchor-id') || section.id;
        const isMatch = sectionId === cleanId;

        if (isMatch) {
          section.classList.add(LegalContent.classes.active);
          section.removeAttribute('hidden');
          targetSection = section;
        } else {
          section.classList.remove(LegalContent.classes.active);
          section.setAttribute('hidden', '');
        }
      });

      // Fallback: if not matched, activate first section
      if (!targetSection && this.sections.length > 0 && this.sections[0]) {
        targetSection = this.sections[0];
        targetSection.classList.add(LegalContent.classes.active);
        targetSection.removeAttribute('hidden');
      }

      const activeId = targetSection ? (targetSection.getAttribute('data-anchor-id') || targetSection.id) : cleanId;

      if (this.tocLinks && this.tocLinks.length > 0) {
        this.tocLinks.forEach((link) => {
          if (!link) return;
          const linkTarget = (link.getAttribute('data-target') || link.getAttribute('href') || '').replace(/^#/, '').trim();
          const isCurrent = linkTarget === activeId;

          if (isCurrent) {
            link.classList.add(LegalContent.classes.active);
            link.setAttribute('aria-selected', 'true');
            link.setAttribute('aria-current', 'true');
            link.setAttribute('tabindex', '0');
          } else {
            link.classList.remove(LegalContent.classes.active);
            link.setAttribute('aria-selected', 'false');
            link.removeAttribute('aria-current');
            link.setAttribute('tabindex', '-1');
          }
        });
      }

      if (this.selectEl && this.selectEl.value !== activeId) {
        this.selectEl.value = activeId;
      }

      const nextHash = `#${activeId}`;
      if (window.location && window.location.hash !== nextHash && window.history && window.history.replaceState) {
        try {
          window.history.replaceState(null, '', nextHash);
        } catch {
          // Ignore state manipulation errors if any
        }
      }

      if (targetSection) {
        const heading = targetSection.querySelector('h2, h3, [role="heading"]');
        if (heading && typeof heading.focus === 'function') {
          if (!heading.hasAttribute('tabindex')) {
            heading.setAttribute('tabindex', '-1');
          }
          heading.focus({ preventScroll: true });
        }
      }

      if (fromDropdown && typeof window !== 'undefined' && window.innerWidth < 1024) {
        const dropdownBox = this.querySelector(LegalContent.selectors.dropdownWrapper);
        if (dropdownBox && typeof dropdownBox.getBoundingClientRect === 'function') {
          const rect = dropdownBox.getBoundingClientRect();
          if (rect.top < 0 && typeof dropdownBox.scrollIntoView === 'function') {
            const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            dropdownBox.scrollIntoView({
              behavior: prefersReducedMotion ? 'auto' : 'smooth',
              block: 'start'
            });
          }
        }
      }
    }

    handleInitialHash() {
      if (typeof window === 'undefined') return;
      const hash = window.location ? window.location.hash : '';

      if (hash && hash.length > 1) {
        const targetId = hash.replace(/^#/, '').trim();
        if (targetId) {
          const targetSection = this.querySelector(`#${targetId}`);
          if (targetSection) {
            this.activateSection(targetId);
            return;
          }
        }
      }

      // Default: activate first section if none specified
      if (this.sections && this.sections.length > 0 && this.sections[0]) {
        const firstId = this.sections[0].getAttribute('data-anchor-id') || this.sections[0].id;
        if (firstId) {
          this.activateSection(firstId);
        }
      }
    }
  }

  customElements.define('legal-content', LegalContent);
}

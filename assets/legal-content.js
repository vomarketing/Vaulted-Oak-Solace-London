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
      tocContainer: '.legal-content__toc',
      mobileSidebar: '[data-legal-mobile-sidebar]',
      mobileSidebarTrigger: '[data-legal-mobile-sidebar-trigger]',
      mobileSidebarOverlay: '[data-legal-mobile-sidebar-overlay]',
      mobileSidebarPanel: '[data-legal-mobile-sidebar-panel]',
      mobileSidebarLinks: '[data-legal-mobile-sidebar-link]',
      mobileSidebarSelected: '[data-legal-mobile-sidebar-selected]'
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
      this.mobileSidebarSelected = null;
      this.mobileSidebarLinks = [];
      this.dropdownWrapper = null;
    }

    connectedCallback() {
      this.abortController = new AbortController();
      this.layoutMode = this.getAttribute('data-layout') || 'sidebar';

      this.tocLinks = Array.from(this.querySelectorAll(LegalContent.selectors.tocLinks));
      this.sections = Array.from(this.querySelectorAll(LegalContent.selectors.sections));
      this.selectEl = this.querySelector(LegalContent.selectors.select);
      this.mobileSidebarSelected = this.querySelector(LegalContent.selectors.mobileSidebarSelected);
      this.mobileSidebarLinks = Array.from(this.querySelectorAll(LegalContent.selectors.mobileSidebarLinks));
      this.dropdownWrapper = this.querySelector(LegalContent.selectors.dropdownWrapper);

      this.bindEvents();

      if (this.sections.length === 0) return;

      if (this.layoutMode === 'sidebar') {
        this.handleInitialHash(true);
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
      this.mobileSidebarSelected = null;
      this.mobileSidebarLinks = [];
      this.dropdownWrapper = null;
    }

    bindEvents() {
      if (!this.abortController) return;
      const { signal } = this.abortController;

      const mobileSidebar = this.querySelector(LegalContent.selectors.mobileSidebar);
      const mobileSidebarTrigger = this.querySelector(LegalContent.selectors.mobileSidebarTrigger);
      const mobileSidebarOverlay = this.querySelector(LegalContent.selectors.mobileSidebarOverlay);
      const mobileSidebarPanel = this.querySelector(LegalContent.selectors.mobileSidebarPanel);

      if (mobileSidebar && mobileSidebarTrigger && mobileSidebarOverlay && mobileSidebarPanel) {
        const setMobileSidebarOpen = (open, restoreFocus = false) => {
          mobileSidebar.setAttribute('aria-expanded', String(open));
          mobileSidebarTrigger.setAttribute('aria-expanded', String(open));

          if (open) {
            const firstLink = mobileSidebarPanel.querySelector(LegalContent.selectors.mobileSidebarLinks);
            if (firstLink) firstLink.focus();
          } else if (restoreFocus) {
            mobileSidebarTrigger.focus();
          }
        };

        mobileSidebarTrigger.addEventListener(
          'click',
          () => setMobileSidebarOpen(mobileSidebar.getAttribute('aria-expanded') !== 'true'),
          { signal }
        );

        mobileSidebarOverlay.addEventListener('click', () => setMobileSidebarOpen(false, true), { signal });

        mobileSidebarPanel.addEventListener(
          'click',
          (event) => {
            const link = event.target.closest(LegalContent.selectors.mobileSidebarLinks);
            if (!link) return;

            const targetId = link.getAttribute('data-target');
            if (targetId) this.activateSection(targetId);
            setMobileSidebarOpen(false);
          },
          { signal }
        );

        document.addEventListener(
          'keydown',
          (event) => {
            if (event.key === 'Escape' && mobileSidebar.getAttribute('aria-expanded') === 'true') {
              setMobileSidebarOpen(false, true);
            }
          },
          { signal }
        );
      }

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
        if (tocContainer && this.tocLinks.length > 0) {
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
            this.handleInitialHash(false);
          },
          { signal }
        );
      }
    }

    findSection(targetId) {
      if (!targetId || typeof targetId !== 'string') return null;
      let cleanId = targetId.replace(/^#/, '').trim();
      try {
        cleanId = decodeURIComponent(cleanId);
      } catch {
        // Keep cleanId if decode fails
      }
      if (!cleanId || !this.sections || this.sections.length === 0) return null;

      const strippedId = cleanId.replace(/^section-/, '');
      const prefixedId = `section-${strippedId}`;

      return (
        this.sections.find((section) => {
          if (!section) return false;
          const sectionAnchor = section.getAttribute('data-anchor-id') || '';
          const sectionId = section.id || '';
          return (
            sectionAnchor === cleanId ||
            sectionAnchor === prefixedId ||
            sectionAnchor === strippedId ||
            sectionId === cleanId ||
            sectionId === prefixedId ||
            sectionId === strippedId
          );
        }) || null
      );
    }

    isMatchId(candidateId, activeId, strippedActiveId) {
      if (!candidateId) return false;
      const cleanCandidate = candidateId.replace(/^#/, '').trim();
      return (
        cleanCandidate === activeId ||
        cleanCandidate === strippedActiveId ||
        cleanCandidate.replace(/^section-/, '') === strippedActiveId
      );
    }

    activateSection(targetId, options = false) {
      if (!targetId || typeof targetId !== 'string') return;
      const cleanId = targetId.replace(/^#/, '').trim();
      if (!cleanId || !this.sections || this.sections.length === 0) return;

      let fromDropdown = false;
      let updateHash = true;

      if (typeof options === 'boolean') {
        fromDropdown = options;
      } else if (typeof options === 'object' && options !== null) {
        fromDropdown = Boolean(options.fromDropdown);
        if (typeof options.updateHash === 'boolean') {
          updateHash = options.updateHash;
        }
      }

      let targetSection = this.findSection(cleanId);

      // Fallback: if not matched, activate first section
      if (!targetSection && this.sections.length > 0 && this.sections[0]) {
        targetSection = this.sections[0];
      }

      if (!targetSection) return;

      const activeId = targetSection.getAttribute('data-anchor-id') || targetSection.id || cleanId;
      const strippedActiveId = activeId.replace(/^section-/, '');

      this.sections.forEach((section) => {
        if (!section) return;
        const isMatch = section === targetSection;

        if (isMatch) {
          section.classList.add(LegalContent.classes.active);
          section.removeAttribute('hidden');
        } else {
          section.classList.remove(LegalContent.classes.active);
          section.setAttribute('hidden', '');
        }
      });

      if (this.mobileSidebarSelected && targetSection) {
        const heading = targetSection.querySelector('.legal-content__heading, h2, h3, [role="heading"]');
        if (heading) this.mobileSidebarSelected.textContent = heading.textContent.trim();
      }

      if (this.mobileSidebarLinks && this.mobileSidebarLinks.length > 0) {
        this.mobileSidebarLinks.forEach((link) => {
          const isCurrent = this.isMatchId(link.getAttribute('data-target'), activeId, strippedActiveId);
          link.classList.toggle(LegalContent.classes.active, isCurrent);
          if (isCurrent) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }

      if (this.tocLinks && this.tocLinks.length > 0) {
        this.tocLinks.forEach((link) => {
          if (!link) return;
          const linkTarget = link.getAttribute('data-target') || link.getAttribute('href');
          const isCurrent = this.isMatchId(linkTarget, activeId, strippedActiveId);

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

      if (this.selectEl) {
        const matchingOption = Array.from(this.selectEl.options || []).find((option) =>
          this.isMatchId(option.value, activeId, strippedActiveId)
        );
        if (matchingOption && this.selectEl.value !== matchingOption.value) {
          this.selectEl.value = matchingOption.value;
        }
      }

      if (updateHash) {
        const nextHash = `#${activeId}`;
        if (window.location && window.location.hash !== nextHash && window.history && window.history.replaceState) {
          try {
            window.history.replaceState(null, '', nextHash);
          } catch {
            // Ignore state manipulation errors if any
          }
        }
      }

      if (fromDropdown && typeof window !== 'undefined' && window.innerWidth < 1024) {
        const dropdownBox = this.dropdownWrapper;
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

    handleInitialHash(isInitialLoad = false) {
      if (typeof window === 'undefined') return;
      const hash = window.location ? window.location.hash : '';

      if (hash && hash.length > 1) {
        const rawId = hash.replace(/^#/, '').trim();
        if (rawId) {
          const targetSection = this.findSection(rawId);
          if (targetSection) {
            const targetId = targetSection.getAttribute('data-anchor-id') || targetSection.id || rawId;
            this.activateSection(targetId, {
              fromDropdown: false,
              updateHash: false
            });
            return;
          }
        }
      }

      // Default: activate first section if none specified
      if (this.sections && this.sections.length > 0 && this.sections[0]) {
        const firstId = this.sections[0].getAttribute('data-anchor-id') || this.sections[0].id;
        if (firstId) {
          this.activateSection(firstId, {
            fromDropdown: false,
            updateHash: !isInitialLoad
          });
        }
      }
    }
  }

  customElements.define('legal-content', LegalContent);
}

/**
 * PDP Size & Fit Guide Fullscreen Modal Web Component (<pdp-size-guide>)
 * Handles modal open/close, auto-detected regional size display (Shopify country),
 * unit conversion (CM/IN), and row highlight interactions.
 */

if (!customElements.get('pdp-size-guide')) {
  class PdpSizeGuide extends HTMLElement {
    static selectors = {
      modal: '.js-pdp-size-guide-modal',
      triggers: '.js-pdp-size-guide-trigger',
      closeButtons: '.js-pdp-size-guide-close',
      matrixScript: '.js-pdp-size-guide-matrix',
      unitButtons: '.js-pdp-unit-btn',
      table: '.js-pdp-size-table',
      tableRows: '.js-pdp-table-row',
      cellSize: '.js-cell-size',
      cellMeasurement: '.js-cell-measurement'
    };

    static classes = {
      modalActive: 'is-active',
      drawerActive: 'drw-Drawer-active',
      scrollLocked: 'is-scroll-locked',
      bodyModalActive: 'is-size-guide-active',
      highlighted: 'is-highlighted',
      active: 'is-active'
    };

    constructor() {
      super();

      this.selectors = PdpSizeGuide.selectors;
      this.classes = PdpSizeGuide.classes;
      this.currentRegion = this.getAttribute('data-default-region') || 'UK';
      this.currentUnit = this.getAttribute('data-default-unit') || 'cm';
      this.matrixData = null;
      this.abortController = null;
    }

    connectedCallback() {
      this.abortController = new AbortController();
      this.modalEl = this.closest(this.selectors.modal) || document.querySelector(this.selectors.modal);

      this.parseMatrixData();
      this.bindEvents();
      this.renderCurrentState();
    }

    disconnectedCallback() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }

    parseMatrixData() {
      const scriptEl = this.querySelector(this.selectors.matrixScript);
      if (scriptEl && scriptEl.textContent) {
        try {
          const parsed = JSON.parse(scriptEl.textContent);
          this.matrixData = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        } catch (err) {
          console.warn('[SizeGuide] Could not parse chart matrix JSON:', err);
        }
      }
    }

    bindEvents() {
      const { signal } = this.abortController;

      // Event delegation for Trigger and Close buttons
      document.addEventListener(
        'click',
        (e) => {
          const trigger = e.target.closest(this.selectors.triggers);
          if (trigger) {
            e.preventDefault();
            this.openModal();
            return;
          }

          const closeBtn = e.target.closest(this.selectors.closeButtons);
          if (closeBtn) {
            e.preventDefault();
            this.closeModal();
          }
        },
        { signal }
      );

      // Escape key listener to close modal
      window.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && this.isModalOpen()) {
            this.closeModal();
          }
        },
        { signal }
      );

      // Unit Toggle (CM / IN) - Event delegation within component
      this.addEventListener(
        'click',
        (e) => {
          const unitBtn = e.target.closest(this.selectors.unitButtons);
          if (unitBtn) {
            e.preventDefault();
            const unit = unitBtn.getAttribute('data-unit');
            if (unit && unit !== this.currentUnit) {
              this.setUnit(unit);
            }
          }
        },
        { signal }
      );

      // Table Row highlight delegation
      const tables = this.querySelectorAll(this.selectors.table);
      tables.forEach((table) => {
        table.addEventListener(
          'click',
          (e) => {
            const row = e.target.closest(this.selectors.tableRows);
            if (!row) return;

            const tbody = row.closest('tbody');
            if (tbody) {
              tbody.querySelectorAll(this.selectors.tableRows).forEach((r) => r.classList.remove(this.classes.highlighted));
              row.classList.add(this.classes.highlighted);
            }
          },
          { signal }
        );
      });
    }

    openModal() {
      if (!this.modalEl || !document.body.contains(this.modalEl)) {
        this.modalEl = this.closest(this.selectors.modal) || document.querySelector(this.selectors.modal);
      }
      if (!this.modalEl) return;

      this.modalEl.classList.add(this.classes.modalActive, this.classes.drawerActive);
      this.modalEl.setAttribute('aria-hidden', 'false');
      document.body.classList.add(this.classes.scrollLocked, this.classes.bodyModalActive, 'util-Drawer-active', 'drw-Drawers-active');
    }

    closeModal() {
      if (!this.modalEl || !document.body.contains(this.modalEl)) {
        this.modalEl = this.closest(this.selectors.modal) || document.querySelector(this.selectors.modal);
      }
      if (!this.modalEl) return;

      this.modalEl.classList.remove(this.classes.modalActive, this.classes.drawerActive);
      this.modalEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove(this.classes.scrollLocked, this.classes.bodyModalActive, 'util-Drawer-active', 'drw-Drawers-active');
    }

    isModalOpen() {
      if (!this.modalEl || !document.body.contains(this.modalEl)) {
        this.modalEl = this.closest(this.selectors.modal) || document.querySelector(this.selectors.modal);
      }
      return Boolean(
        this.modalEl &&
        (this.modalEl.classList.contains(this.classes.modalActive) ||
          this.modalEl.classList.contains(this.classes.drawerActive) ||
          this.modalEl.getAttribute('aria-hidden') === 'false')
      );
    }

    setUnit(unit) {
      if (!unit) return;
      this.currentUnit = unit;

      // Update toggle buttons active state across all tables (desktop & mobile)
      const unitButtons = this.querySelectorAll(this.selectors.unitButtons);
      if (unitButtons && unitButtons.length) {
        unitButtons.forEach((btn) => {
          const btnUnit = btn.getAttribute('data-unit');
          const isActive = btnUnit === unit;
          btn.classList.toggle(this.classes.active, isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }

      this.renderTableMeasurements();
    }

    renderCurrentState() {
      this.renderTableSizes();
      this.renderTableMeasurements();
    }

    renderTableSizes() {
      if (!this.matrixData || !Array.isArray(this.matrixData.rows) || !this.matrixData.rows.length) return;
      const rows = this.matrixData.rows;
      const tables = this.querySelectorAll(this.selectors.table);
      if (!tables || !tables.length) return;

      tables.forEach((table) => {
        const domRows = table.querySelectorAll(this.selectors.tableRows);
        if (!domRows || !domRows.length) return;

        domRows.forEach((domRow, fallbackIndex) => {
          const rowIndexAttr = domRow.getAttribute('data-row-index');
          const index = rowIndexAttr !== null ? parseInt(rowIndexAttr, 10) : fallbackIndex;
          const rowData = rows[index];
          if (!rowData || !rowData.sizes) return;

          const sizeCell = domRow.querySelector(this.selectors.cellSize);
          if (sizeCell) {
            const sizeVal = rowData.sizes[this.currentRegion] || rowData.sizes.UK || rowData.sizes.US || '';
            sizeCell.textContent = sizeVal;
          }
        });
      });
    }

    renderTableMeasurements() {
      const isInch = this.currentUnit === 'in';
      const measCells = this.querySelectorAll(this.selectors.cellMeasurement);
      if (!measCells || !measCells.length) return;

      measCells.forEach((cell) => {
        const val = isInch ? cell.getAttribute('data-in') : cell.getAttribute('data-cm');
        if (val !== null) {
          cell.textContent = val;
        }
      });
    }
  }

  customElements.define('pdp-size-guide', PdpSizeGuide);
}

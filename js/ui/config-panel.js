/**
 * Config Panel UI
 * Manages the left configuration panel: type selection, dimensions, seed, algorithm params.
 */

export class ConfigPanel {
  /**
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(store) {
    this.store = store;
    this._bindEvents();
    this._updateVisibility();
  }

  /**
   * Bind all config panel events.
   */
  _bindEvents() {
    // Type radio buttons
    document.querySelectorAll('input[name="maze-type"]').forEach((radio) => {
      radio.addEventListener('change', () => this._updateVisibility());
    });

    // Classic subtype radios
    document.querySelectorAll('input[name="classic-subtype"]').forEach((radio) => {
      radio.addEventListener('change', () => this._updateVisibility());
    });

    // Dimension inputs - validate on change
    document.getElementById('input-rows').addEventListener('change', (e) => {
      this._validateDimension(e.target, 'Rows');
    });
    document.getElementById('input-cols').addEventListener('change', (e) => {
      this._validateDimension(e.target, 'Columns');
    });

    // Density slider
    document.getElementById('slider-density').addEventListener('input', (e) => {
      document.getElementById('density-value').textContent = (e.target.value / 100).toFixed(1);
    });

    // Dead-end frequency slider
    document.getElementById('slider-dead-ends').addEventListener('input', (e) => {
      document.getElementById('dead-ends-value').textContent = (e.target.value / 100).toFixed(1);
    });

    // Seed copy button
    document.getElementById('btn-copy-seed').addEventListener('click', () => {
      const seed = this.store.maze?.seed;
      if (seed != null) {
        navigator.clipboard.writeText(String(seed)).then(() => {
          const btn = document.getElementById('btn-copy-seed');
          const original = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = original; }, 1500);
        });
      }
    });
  }

  /**
   * Update visibility of config sections based on selected type.
   */
  _updateVisibility() {
    const type = document.querySelector('input[name="maze-type"]:checked')?.value;
    const subType = document.querySelector('input[name="classic-subtype"]:checked')?.value;

    // Classic sub-options
    document.getElementById('classic-sub-options').hidden = type !== 'classic';

    // Dead-end frequency (only for imperfect)
    document.getElementById('section-dead-ends').hidden = !(type === 'classic' && subType === 'imperfect');

    // Symmetry and wrapping (only for pac-man)
    document.getElementById('section-symmetry').hidden = type !== 'pacman';

    // Density is always visible when a type is selected
    document.getElementById('section-density').hidden = !type;
  }

  /**
   * Validate a dimension input.
   */
  _validateDimension(input, label) {
    const value = parseInt(input.value, 10);
    const errorEl = document.getElementById('dim-error');

    if (isNaN(value)) {
      errorEl.textContent = `${label} must be a positive integer.`;
      errorEl.hidden = false;
      input.style.borderColor = 'var(--color-danger)';
      return false;
    }

    if (value < 5 || value > 100) {
      errorEl.textContent = `${label} must be between 5 and 100.`;
      errorEl.hidden = false;
      input.style.borderColor = 'var(--color-danger)';
      return false;
    }

    errorEl.hidden = true;
    input.style.borderColor = '';
    return true;
  }

  /**
   * Read the current configuration from the panel.
   * @returns {object}
   */
  readConfig() {
    const type = document.querySelector('input[name="maze-type"]:checked')?.value || null;
    const subType = type === 'classic'
      ? document.querySelector('input[name="classic-subtype"]:checked')?.value || null
      : null;

    return {
      type,
      subType,
      rows: document.getElementById('input-rows').value,
      columns: document.getElementById('input-cols').value,
      seed: document.getElementById('input-seed').value || null,
      density: parseInt(document.getElementById('slider-density').value, 10) / 100,
      deadEndFrequency: parseInt(document.getElementById('slider-dead-ends').value, 10) / 100,
      symmetry: document.getElementById('select-symmetry').value,
      edgeWrapping: document.getElementById('select-wrapping').value,
    };
  }
}

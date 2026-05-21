/**
 * Toolbar UI
 * Manages tool buttons, paint mode toggle, and undo/redo button states.
 */

export class Toolbar {
  /**
   * @param {import('../state/store.js').StateStore} store
   * @param {import('../state/history.js').HistoryManager} history
   */
  constructor(store, history) {
    this.store = store;
    this.history = history;
    this._bindStateListeners();
  }

  /**
   * Bind reactive state listeners for toolbar updates.
   */
  _bindStateListeners() {
    // Tool changed - update active button
    this.store.subscribe('tool-changed', (tool) => {
      document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
      });
    });

    // Paint mode changed
    this.store.subscribe('paint-mode-changed', (mode) => {
      const label = document.getElementById('paint-mode-label');
      if (label) {
        label.textContent = mode === 'wall' ? 'Wall' : 'Path';
      }
      const btn = document.getElementById('btn-paint-mode');
      if (btn) {
        btn.classList.toggle('active', mode === 'pathway');
      }
    });

    // Update undo/redo on any state change that might affect them
    this.store.subscribe('cells-changed', () => this._updateUndoRedo());
    this.store.subscribe('maze-replaced', () => this._updateUndoRedo());
    this.store.subscribe('dirty-changed', () => this._updateUndoRedo());
  }

  /**
   * Update undo/redo button disabled states.
   */
  _updateUndoRedo() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = !this.history.canUndo();
    if (redoBtn) redoBtn.disabled = !this.history.canRedo();
  }
}

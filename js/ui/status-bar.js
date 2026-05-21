/**
 * Status Bar UI
 * Displays seed, dimensions, maze type, and solvability warnings.
 * Uses aria-live for screen reader updates.
 */

export class StatusBar {
  /**
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(store) {
    this.store = store;
    this._bindStateListeners();
  }

  /**
   * Bind reactive state listeners for status bar updates.
   */
  _bindStateListeners() {
    // Maze replaced - update all fields
    this.store.subscribe('maze-replaced', (maze) => {
      this._updateSeed(maze.seed);
      this._updateDimensions(maze.rows, maze.columns);
      this._updateType(maze.type, maze.subType);
      this._updateWarning(null); // clear warning on new maze
    });

    // Path status changed
    this.store.subscribe('path-status-changed', (valid) => {
      if (valid === false) {
        this._updateWarning('⚠ No path found');
      } else {
        this._updateWarning(null);
      }
    });

    // Cursor changed - update coordinates
    this.store.subscribe('cursor-changed', (cell) => {
      const coordEl = document.getElementById('coordinates');
      if (coordEl) {
        coordEl.textContent = cell ? `(${cell.row}, ${cell.col})` : '--';
      }
    });
  }

  /**
   * Update seed display.
   */
  _updateSeed(seed) {
    const el = document.getElementById('status-seed');
    if (el) el.textContent = `Seed: ${seed}`;
  }

  /**
   * Update dimensions display.
   */
  _updateDimensions(rows, columns) {
    const el = document.getElementById('status-dims');
    if (el) el.textContent = `${rows}×${columns}`;
  }

  /**
   * Update type display.
   */
  _updateType(type, subType) {
    const el = document.getElementById('status-type');
    if (!el) return;

    if (type === 'classic') {
      el.textContent = `Classic ${subType ? subType.charAt(0).toUpperCase() + subType.slice(1) : ''}`;
    } else if (type === 'pacman') {
      el.textContent = 'Pac-Man';
    } else {
      el.textContent = 'No maze';
    }
  }

  /**
   * Update warning display.
   */
  _updateWarning(message) {
    const el = document.getElementById('status-warning');
    if (!el) return;

    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }
}

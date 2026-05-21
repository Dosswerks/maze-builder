/**
 * Autosave Manager
 * Periodically saves maze state to localStorage for crash recovery.
 */

const STORAGE_KEY = 'maze_builder_autosave';
const AUTOSAVE_INTERVAL = 60000; // 60 seconds

export class AutosaveManager {
  /**
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(store) {
    this.store = store;
    this._intervalId = null;
  }

  /**
   * Start the autosave timer.
   */
  start() {
    this.stop(); // clear any existing timer
    this._intervalId = setInterval(() => this._tick(), AUTOSAVE_INTERVAL);
  }

  /**
   * Stop the autosave timer.
   */
  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Autosave tick: write state if dirty.
   */
  _tick() {
    if (!this.store.editor.isDirty || !this.store.maze) return;
    this.save();
  }

  /**
   * Save current maze state to localStorage (no history).
   */
  save() {
    const maze = this.store.maze;
    if (!maze) return;

    const payload = {
      type: maze.type,
      subType: maze.subType,
      rows: maze.rows,
      columns: maze.columns,
      seed: maze.seed,
      cells: Array.from(maze.cells),
      config: maze.config,
      createdAt: maze.createdAt,
      modifiedAt: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      // Quota exceeded - try minimal payload
      try {
        const minimal = {
          type: maze.type,
          subType: maze.subType,
          rows: maze.rows,
          columns: maze.columns,
          seed: maze.seed,
          cells: Array.from(maze.cells),
          config: maze.config,
          createdAt: maze.createdAt,
          modifiedAt: new Date().toISOString(),
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      } catch (innerErr) {
        console.warn('Autosave failed: localStorage quota exceeded.');
      }
    }
  }

  /**
   * Check if recovery data exists.
   * @returns {boolean}
   */
  hasRecoveryData() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Get recovery data.
   * @returns {object|null} Maze state or null
   */
  getRecoveryData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return {
        type: data.type,
        subType: data.subType || null,
        rows: data.rows,
        columns: data.columns,
        seed: data.seed,
        cells: new Uint8Array(data.cells),
        metadata: new Map(),
        config: data.config || { density: 0.5, deadEndFrequency: 0.3, symmetry: 'none', edgeWrapping: false },
        createdAt: data.createdAt || new Date().toISOString(),
        modifiedAt: data.modifiedAt || new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Failed to parse autosave data:', err);
      return null;
    }
  }

  /**
   * Clear recovery data (called after successful manual save).
   */
  clearRecoveryData() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

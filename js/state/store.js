/**
 * State Store
 * Central state management with pub/sub event system.
 */

export class StateStore {
  constructor() {
    this._listeners = new Map();

    /** @type {import('../../types').MazeState|null} */
    this.maze = null;

    /** @type {import('../../types').EditorState} */
    this.editor = {
      activeTool: 'pencil',
      paintMode: 'wall',
      isDirty: false,
      isPathValid: null,
      showPathOverlay: false,
      showUnreachable: false,
      showGridLines: true,
    };

    /** @type {import('../../types').ViewState} */
    this.view = {
      zoom: 1,
      panX: 0,
      panY: 0,
      cellSize: 16,
      cursorCell: null,
      showMinimap: false,
    };
  }

  // --- Event System ---

  /**
   * Subscribe to a state event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Emit a state event.
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  // --- Maze State ---

  /**
   * Replace the entire maze state.
   * @param {import('../../types').MazeState} maze
   */
  setMazeState(maze) {
    this.maze = maze;
    this.view.showMinimap = maze.rows > 30 || maze.columns > 30;
    this.emit('maze-replaced', maze);
  }

  /**
   * Apply cell changes to the grid.
   * @param {Array<{index: number, oldValue: number, newValue: number}>} changes
   */
  updateCells(changes) {
    if (!this.maze) return;
    for (const change of changes) {
      this.maze.cells[change.index] = change.newValue;
    }
    this.maze.modifiedAt = new Date().toISOString();
    this.emit('cells-changed', changes);
  }

  /**
   * Revert cell changes (for undo).
   * @param {Array<{index: number, oldValue: number, newValue: number}>} changes
   */
  revertCells(changes) {
    if (!this.maze) return;
    for (const change of changes) {
      this.maze.cells[change.index] = change.oldValue;
    }
    this.maze.modifiedAt = new Date().toISOString();
    this.emit('cells-changed', changes);
  }

  // --- Editor State ---

  /**
   * Set the active editing tool.
   * @param {string} tool
   */
  setEditorTool(tool) {
    this.editor.activeTool = tool;
    this.emit('tool-changed', tool);
  }

  /**
   * Set the paint mode (wall or pathway).
   * @param {'wall'|'pathway'} mode
   */
  setPaintMode(mode) {
    this.editor.paintMode = mode;
    this.emit('paint-mode-changed', mode);
  }

  /**
   * Toggle paint mode between wall and pathway.
   */
  togglePaintMode() {
    this.setPaintMode(this.editor.paintMode === 'wall' ? 'pathway' : 'wall');
  }

  /**
   * Set the dirty (unsaved changes) flag.
   * @param {boolean} dirty
   */
  setDirty(dirty) {
    this.editor.isDirty = dirty;
    this.emit('dirty-changed', dirty);
  }

  /**
   * Set path validity status.
   * @param {boolean|null} valid
   */
  setPathValid(valid) {
    this.editor.isPathValid = valid;
    this.emit('path-status-changed', valid);
  }

  /**
   * Toggle path overlay visibility.
   */
  togglePathOverlay() {
    this.editor.showPathOverlay = !this.editor.showPathOverlay;
    this.emit('overlay-changed', { type: 'path', visible: this.editor.showPathOverlay });
  }

  /**
   * Toggle unreachable region highlighting.
   */
  toggleUnreachable() {
    this.editor.showUnreachable = !this.editor.showUnreachable;
    this.emit('overlay-changed', { type: 'unreachable', visible: this.editor.showUnreachable });
  }

  /**
   * Toggle grid lines.
   */
  toggleGridLines() {
    this.editor.showGridLines = !this.editor.showGridLines;
    this.emit('grid-lines-changed', this.editor.showGridLines);
  }

  // --- View State ---

  /**
   * Set zoom, pan, and cell size.
   * @param {number} zoom
   * @param {number} panX
   * @param {number} panY
   */
  setViewTransform(zoom, panX, panY) {
    this.view.zoom = zoom;
    this.view.panX = panX;
    this.view.panY = panY;
    this.view.cellSize = Math.max(8, Math.round(16 * zoom));
    this.emit('view-changed', this.view);
  }

  /**
   * Set the cell currently under the cursor.
   * @param {{ row: number, col: number }|null} cell
   */
  setCursorCell(cell) {
    this.view.cursorCell = cell;
    this.emit('cursor-changed', cell);
  }
}

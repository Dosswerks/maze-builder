/**
 * Canvas Renderer
 * Renders the maze grid on an HTML5 Canvas with zoom/pan support.
 */

const COLORS = {
  wall: '#2d3748',
  pathway: '#f7fafc',
  start: '#38a169',
  end: '#e53e3e',
  gridLine: '#4a5568',
  focus: '#805ad5',
  background: '#171923',
};

export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(canvas, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.focusCell = null;

    // Subscribe to state changes
    store.subscribe('maze-replaced', () => this.fitToScreen());
    store.subscribe('cells-changed', (changes) => this.renderDirtyRegion(changes));
    store.subscribe('view-changed', () => this.render());
    store.subscribe('grid-lines-changed', () => this.render());
    store.subscribe('cursor-changed', () => this.renderCursorUpdate());

    // Handle resize
    this._resizeObserver = new ResizeObserver(() => this.handleResize());
    this._resizeObserver.observe(canvas.parentElement);
  }

  /**
   * Handle container resize.
   */
  handleResize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  /**
   * Calculate cell size to fit the grid in the viewport.
   */
  fitToScreen() {
    const maze = this.store.maze;
    if (!maze) return;

    // Hide empty state
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.hidden = true;

    const parent = this.canvas.parentElement;
    if (!parent) return;
    const availW = parent.clientWidth - 20;
    const availH = parent.clientHeight - 20;
    if (availW <= 0 || availH <= 0) return;

    const cellW = availW / maze.columns;
    const cellH = availH / maze.rows;
    const cellSize = Math.max(8, Math.min(Math.floor(Math.min(cellW, cellH)), 40));

    const zoom = cellSize / 16;
    const totalW = cellSize * maze.columns;
    const totalH = cellSize * maze.rows;
    const panX = Math.floor((parent.clientWidth - totalW) / 2);
    const panY = Math.floor((parent.clientHeight - totalH) / 2);

    this.store.setViewTransform(zoom, panX, panY);
    this.handleResize();
  }

  /**
   * Full render of the maze grid.
   */
  render() {
    const maze = this.store.maze;
    const ctx = this.ctx;
    const view = this.store.view;
    const dpr = window.devicePixelRatio || 1;

    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    if (!maze) return;

    const cellSize = view.cellSize;
    const offsetX = view.panX;
    const offsetY = view.panY;

    // Draw cells
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.columns; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        // Skip cells outside viewport
        if (x + cellSize < 0 || x > w || y + cellSize < 0 || y > h) continue;

        const idx = r * maze.columns + c;
        const cellValue = maze.cells[idx];

        // Fill cell
        ctx.fillStyle = this.getCellColor(cellValue);
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw markers for Start/End
        if (cellValue === 2) {
          this.drawStartMarker(ctx, x, y, cellSize);
        } else if (cellValue === 3) {
          this.drawEndMarker(ctx, x, y, cellSize);
        }
      }
    }

    // Draw grid lines
    if (this.store.editor.showGridLines && cellSize >= 8) {
      this.drawGridLines(ctx, maze, cellSize, offsetX, offsetY, w, h);
    }

    // Draw focus cell
    if (this.focusCell) {
      this.drawFocusIndicator(ctx, this.focusCell, cellSize, offsetX, offsetY);
    }

    // Notify overlays to render (if registered)
    if (this._overlayCallback) {
      this._overlayCallback();
    }
  }

  /**
   * Register an overlay render callback.
   * @param {Function} callback
   */
  setOverlayCallback(callback) {
    this._overlayCallback = callback;
  }

  /**
   * Get fill color for a cell value.
   */
  getCellColor(value) {
    switch (value) {
      case 0: return COLORS.wall;
      case 1: return COLORS.pathway;
      case 2: return COLORS.pathway; // Start drawn on pathway background
      case 3: return COLORS.pathway; // End drawn on pathway background
      default: return COLORS.wall;
    }
  }

  /**
   * Draw Start marker (filled circle).
   */
  drawStartMarker(ctx, x, y, cellSize) {
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const radius = cellSize * 0.35;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.start;
    ctx.fill();
  }

  /**
   * Draw End marker (filled diamond).
   */
  drawEndMarker(ctx, x, y, cellSize) {
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const r = cellSize * 0.35;

    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fillStyle = COLORS.end;
    ctx.fill();
  }

  /**
   * Draw grid lines between cells.
   */
  drawGridLines(ctx, maze, cellSize, offsetX, offsetY, viewW, viewH) {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;

    // Vertical lines
    for (let c = 0; c <= maze.columns; c++) {
      const x = offsetX + c * cellSize;
      if (x < 0 || x > viewW) continue;
      ctx.beginPath();
      ctx.moveTo(x, Math.max(0, offsetY));
      ctx.lineTo(x, Math.min(viewH, offsetY + maze.rows * cellSize));
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = 0; r <= maze.rows; r++) {
      const y = offsetY + r * cellSize;
      if (y < 0 || y > viewH) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, offsetX), y);
      ctx.lineTo(Math.min(viewW, offsetX + maze.columns * cellSize), y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw focus cell indicator (purple outline).
   */
  drawFocusIndicator(ctx, cell, cellSize, offsetX, offsetY) {
    const x = offsetX + cell.col * cellSize;
    const y = offsetY + cell.row * cellSize;

    ctx.strokeStyle = COLORS.focus;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }

  /**
   * Render only changed cells (dirty rectangle optimization).
   * @param {Array<{index: number}>} changes
   */
  renderDirtyRegion(changes) {
    const maze = this.store.maze;
    if (!maze) return;

    const ctx = this.ctx;
    const view = this.store.view;
    const cellSize = view.cellSize;
    const offsetX = view.panX;
    const offsetY = view.panY;

    for (const change of changes) {
      const idx = change.index;
      const r = Math.floor(idx / maze.columns);
      const c = idx % maze.columns;
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;

      const cellValue = maze.cells[idx];

      // Redraw cell
      ctx.fillStyle = this.getCellColor(cellValue);
      ctx.fillRect(x, y, cellSize, cellSize);

      if (cellValue === 2) this.drawStartMarker(ctx, x, y, cellSize);
      else if (cellValue === 3) this.drawEndMarker(ctx, x, y, cellSize);

      // Redraw grid lines around this cell
      if (this.store.editor.showGridLines && cellSize >= 8) {
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.strokeRect(x, y, cellSize, cellSize);
        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * Convert pixel coordinates to grid cell.
   * @param {number} pixelX
   * @param {number} pixelY
   * @returns {{ row: number, col: number }|null}
   */
  cellAtPixel(pixelX, pixelY) {
    const maze = this.store.maze;
    if (!maze) return null;

    const view = this.store.view;
    const cellSize = view.cellSize;

    const col = Math.floor((pixelX - view.panX) / cellSize);
    const row = Math.floor((pixelY - view.panY) / cellSize);

    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.columns) {
      return null;
    }

    return { row, col };
  }

  /**
   * Set focus cell for keyboard navigation.
   * @param {number} row
   * @param {number} col
   */
  setFocusCell(row, col) {
    this.focusCell = { row, col };
    this.render();
  }

  /**
   * Update cursor display (lightweight, no full re-render).
   */
  renderCursorUpdate() {
    // Cursor coordinate display is handled by the UI layer
    // This is a hook for future hover highlighting
  }

  /**
   * Set zoom level.
   * @param {number} level - Zoom multiplier (0.25 to 4.0)
   */
  setZoom(level) {
    const clamped = Math.max(0.25, Math.min(4.0, level));
    const view = this.store.view;
    this.store.setViewTransform(clamped, view.panX, view.panY);
  }

  /**
   * Set pan offset.
   * @param {number} x
   * @param {number} y
   */
  setPan(x, y) {
    const view = this.store.view;
    this.store.setViewTransform(view.zoom, x, y);
  }
}

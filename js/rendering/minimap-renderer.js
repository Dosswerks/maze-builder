/**
 * Minimap Renderer
 * Renders a small overview of the full maze with viewport indicator.
 */

const COLORS = {
  wall: '#2d3748',
  pathway: '#f7fafc',
  start: '#38a169',
  end: '#e53e3e',
  viewport: 'rgba(66, 153, 225, 0.5)',
  viewportBorder: '#4299e1',
  background: '#1a202c',
};

const MAX_SIZE = 200;

export class MinimapRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../state/store.js').StateStore} store
   * @param {import('./canvas-renderer.js').CanvasRenderer} mainRenderer
   */
  constructor(canvas, store, mainRenderer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.mainRenderer = mainRenderer;

    store.subscribe('maze-replaced', () => this.render());
    store.subscribe('cells-changed', () => this.render());
    store.subscribe('view-changed', () => this.render());

    // Click to jump
    canvas.addEventListener('click', (e) => this._handleClick(e));
  }

  /**
   * Render the minimap.
   */
  render() {
    const maze = this.store.maze;
    if (!maze) return;

    // Only show for large mazes
    if (maze.rows <= 30 && maze.columns <= 30) {
      this.canvas.hidden = true;
      return;
    }
    this.canvas.hidden = false;

    // Calculate scale to fit in MAX_SIZE
    const scaleX = MAX_SIZE / maze.columns;
    const scaleY = MAX_SIZE / maze.rows;
    const scale = Math.min(scaleX, scaleY, 2); // cap at 2px per cell

    const width = Math.ceil(maze.columns * scale);
    const height = Math.ceil(maze.rows * scale);

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this._scale = scale;

    const ctx = this.ctx;

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw cells
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.columns; c++) {
        const idx = r * maze.columns + c;
        const value = maze.cells[idx];

        let color;
        switch (value) {
          case 0: color = COLORS.wall; break;
          case 1: color = COLORS.pathway; break;
          case 2: color = COLORS.start; break;
          case 3: color = COLORS.end; break;
          default: color = COLORS.wall;
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(c * scale),
          Math.floor(r * scale),
          Math.ceil(scale),
          Math.ceil(scale)
        );
      }
    }

    // Draw viewport rectangle
    this._drawViewport(ctx, maze, scale, width, height);
  }

  /**
   * Draw the viewport indicator rectangle.
   */
  _drawViewport(ctx, maze, scale, minimapW, minimapH) {
    const view = this.store.view;
    const parent = this.mainRenderer.canvas.parentElement;
    if (!parent) return;

    const viewW = parent.clientWidth;
    const viewH = parent.clientHeight;
    const cellSize = view.cellSize;

    // Calculate visible area in grid coordinates
    const startCol = Math.max(0, Math.floor(-view.panX / cellSize));
    const startRow = Math.max(0, Math.floor(-view.panY / cellSize));
    const endCol = Math.min(maze.columns, Math.ceil((viewW - view.panX) / cellSize));
    const endRow = Math.min(maze.rows, Math.ceil((viewH - view.panY) / cellSize));

    const x = startCol * scale;
    const y = startRow * scale;
    const w = (endCol - startCol) * scale;
    const h = (endRow - startRow) * scale;

    // Fill
    ctx.fillStyle = COLORS.viewport;
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = COLORS.viewportBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  /**
   * Handle click on minimap to jump viewport.
   */
  _handleClick(e) {
    const maze = this.store.maze;
    if (!maze || !this._scale) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to grid coordinates
    const col = Math.floor(x / this._scale);
    const row = Math.floor(y / this._scale);

    // Center the main viewport on this position
    const parent = this.mainRenderer.canvas.parentElement;
    const viewW = parent.clientWidth;
    const viewH = parent.clientHeight;
    const cellSize = this.store.view.cellSize;

    const panX = viewW / 2 - col * cellSize;
    const panY = viewH / 2 - row * cellSize;

    this.store.setViewTransform(this.store.view.zoom, panX, panY);
  }
}

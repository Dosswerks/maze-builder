/**
 * Tool Preview Renderer
 * Shows visual feedback for active tool operations (rectangle outline, line preview).
 */

const PREVIEW_COLOR = 'rgba(66, 153, 225, 0.4)';
const PREVIEW_BORDER = 'rgba(66, 153, 225, 0.8)';

export class ToolPreviewRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - The main maze canvas
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(canvas, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this._preview = null;
  }

  /**
   * Set rectangle preview (during drag).
   * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} rect
   */
  setRectPreview(rect) {
    this._preview = { type: 'rect', ...rect };
  }

  /**
   * Set line preview (during drag).
   * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} line
   */
  setLinePreview(line) {
    this._preview = { type: 'line', ...line };
  }

  /**
   * Clear any active preview.
   */
  clearPreview() {
    this._preview = null;
  }

  /**
   * Render the current preview overlay.
   * Call this after the main render pass.
   */
  render() {
    if (!this._preview) return;

    const maze = this.store.maze;
    if (!maze) return;

    const view = this.store.view;
    const cellSize = view.cellSize;
    const offsetX = view.panX;
    const offsetY = view.panY;
    const ctx = this.ctx;

    ctx.save();

    if (this._preview.type === 'rect') {
      const minR = Math.min(this._preview.startRow, this._preview.endRow);
      const maxR = Math.max(this._preview.startRow, this._preview.endRow);
      const minC = Math.min(this._preview.startCol, this._preview.endCol);
      const maxC = Math.max(this._preview.startCol, this._preview.endCol);

      const x = offsetX + minC * cellSize;
      const y = offsetY + minR * cellSize;
      const w = (maxC - minC + 1) * cellSize;
      const h = (maxR - minR + 1) * cellSize;

      ctx.fillStyle = PREVIEW_COLOR;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = PREVIEW_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
    } else if (this._preview.type === 'line') {
      const points = bresenham(
        this._preview.startRow, this._preview.startCol,
        this._preview.endRow, this._preview.endCol
      );

      ctx.fillStyle = PREVIEW_COLOR;
      for (const { row, col } of points) {
        ctx.fillRect(
          offsetX + col * cellSize,
          offsetY + row * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    ctx.restore();
  }
}

/**
 * Bresenham's line algorithm for preview.
 */
function bresenham(r0, c0, r1, c1) {
  const points = [];
  let dr = Math.abs(r1 - r0);
  let dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1;
  let sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  let r = r0, c = c0;
  while (true) {
    points.push({ row: r, col: c });
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; r += sr; }
    if (e2 < dr) { err += dr; c += sc; }
  }
  return points;
}

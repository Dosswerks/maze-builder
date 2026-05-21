/**
 * Overlay Renderer
 * Renders solution path and unreachable region overlays on the maze canvas.
 */

import { findPath, findCellByValue, floodFill, countPathwayCells } from '../algorithms/pathfinder.js';

const COLORS = {
  path: '#4299e1',
  unreachable: '#fbd38d',
  warningBorder: '#ed8936',
};

export class OverlayRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../state/store.js').StateStore} store
   */
  constructor(canvas, store) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;

    this._pathCache = null;
    this._unreachableCache = null;
    this._debounceTimer = null;

    // Subscribe to changes
    store.subscribe('cells-changed', () => this._scheduleUpdate());
    store.subscribe('maze-replaced', () => this._invalidateCache());
    store.subscribe('overlay-changed', () => this.render());
    store.subscribe('path-status-changed', () => this.render());
  }

  /**
   * Render all active overlays.
   */
  render() {
    const maze = this.store.maze;
    if (!maze) return;

    const editor = this.store.editor;
    const view = this.store.view;
    const ctx = this.ctx;
    const cellSize = view.cellSize;
    const offsetX = view.panX;
    const offsetY = view.panY;

    // Path overlay
    if (editor.showPathOverlay && maze.type === 'classic') {
      this._renderPathOverlay(ctx, maze, cellSize, offsetX, offsetY);
    }

    // Unreachable overlay
    if (editor.showUnreachable) {
      this._renderUnreachableOverlay(ctx, maze, cellSize, offsetX, offsetY);
    }

    // Warning border
    if (editor.isPathValid === false && maze.type === 'classic') {
      this._renderWarningBorder(ctx);
    }
  }

  /**
   * Render the solution path overlay.
   */
  _renderPathOverlay(ctx, maze, cellSize, offsetX, offsetY) {
    if (!this._pathCache) {
      this._computePath(maze);
    }

    if (!this._pathCache || this._pathCache.length === 0) {
      // No path found - render indicator text
      ctx.save();
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillStyle = COLORS.warningBorder;
      ctx.textAlign = 'center';
      const parent = this.canvas.parentElement;
      ctx.fillText('No path found', parent.clientWidth / 2, 30);
      ctx.restore();
      return;
    }

    // Draw dashed line through cell centers
    ctx.save();
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = Math.max(2, cellSize * 0.3);
    ctx.setLineDash([cellSize * 0.4, cellSize * 0.2]);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    for (let i = 0; i < this._pathCache.length; i++) {
      const idx = this._pathCache[i];
      const row = Math.floor(idx / maze.columns);
      const col = idx % maze.columns;
      const x = offsetX + col * cellSize + cellSize / 2;
      const y = offsetY + row * cellSize + cellSize / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render unreachable region highlighting.
   */
  _renderUnreachableOverlay(ctx, maze, cellSize, offsetX, offsetY) {
    if (!this._unreachableCache) {
      this._computeUnreachable(maze);
    }

    if (!this._unreachableCache || this._unreachableCache.size === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.5;

    for (const idx of this._unreachableCache) {
      const row = Math.floor(idx / maze.columns);
      const col = idx % maze.columns;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      // Diagonal hatched pattern
      ctx.fillStyle = COLORS.unreachable;
      ctx.fillRect(x, y, cellSize, cellSize);

      // Draw diagonal lines for pattern
      ctx.strokeStyle = '#c05621';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render pulsing warning border around the canvas.
   */
  _renderWarningBorder(ctx) {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;

    ctx.save();
    ctx.strokeStyle = COLORS.warningBorder;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.restore();
  }

  /**
   * Compute and cache the solution path.
   */
  _computePath(maze) {
    const startIdx = findCellByValue(maze.cells, 2);
    const endIdx = findCellByValue(maze.cells, 3);

    if (startIdx === -1 || endIdx === -1) {
      this._pathCache = [];
      return;
    }

    this._pathCache = findPath(maze.cells, maze.columns, maze.rows, startIdx, endIdx, false);
    if (!this._pathCache) this._pathCache = [];
  }

  /**
   * Compute and cache unreachable regions.
   */
  _computeUnreachable(maze) {
    this._unreachableCache = new Set();

    // Find anchor: Start point for classic, first pathway for pacman
    let anchorIdx;
    if (maze.type === 'classic') {
      anchorIdx = findCellByValue(maze.cells, 2);
    } else {
      for (let i = 0; i < maze.cells.length; i++) {
        if (maze.cells[i] !== 0) { anchorIdx = i; break; }
      }
    }

    if (anchorIdx === undefined || anchorIdx === -1) return;

    const edgeWrapping = maze.config?.edgeWrapping || 'none';
    const { connected } = floodFill(maze.cells, maze.columns, maze.rows, anchorIdx, edgeWrapping);

    for (let i = 0; i < maze.cells.length; i++) {
      if (maze.cells[i] !== 0 && !connected[i]) {
        this._unreachableCache.add(i);
      }
    }
  }

  /**
   * Invalidate cached computations.
   */
  _invalidateCache() {
    this._pathCache = null;
    this._unreachableCache = null;
  }

  /**
   * Schedule debounced overlay update (200ms after last change).
   */
  _scheduleUpdate() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this._invalidateCache();
      this.render();
      this._debounceTimer = null;
    }, 200);
  }
}

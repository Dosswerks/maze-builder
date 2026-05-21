/**
 * Edit Controller
 * Handles pointer events and editing tools for the maze canvas.
 */

import { rowColToIndex } from '../algorithms/neighbors.js';
import { findPath, findCellByValue } from '../algorithms/pathfinder.js';

const WALL = 0;
const PATHWAY = 1;
const START = 2;
const END = 3;

export class EditController {
  /**
   * @param {import('../state/store.js').StateStore} store
   * @param {import('../state/history.js').HistoryManager} history
   * @param {import('../rendering/canvas-renderer.js').CanvasRenderer} renderer
   */
  constructor(store, history, renderer) {
    this.store = store;
    this.history = history;
    this.renderer = renderer;

    this._isDragging = false;
    this._dragChanges = [];
    this._dragVisited = new Set();
    this._lineStart = null;
    this._rectStart = null;
    this._validationTimeout = null;
  }

  /**
   * Handle pointer down on a cell.
   * @param {number} row
   * @param {number} col
   */
  handlePointerDown(row, col) {
    const maze = this.store.maze;
    if (!maze) return;

    const tool = this.store.editor.activeTool;
    const idx = rowColToIndex(row, col, maze.columns);

    switch (tool) {
      case 'pencil':
        this._isDragging = true;
        this._dragChanges = [];
        this._dragVisited = new Set();
        this._applyPencil(idx);
        break;

      case 'eraser':
        this._isDragging = true;
        this._dragChanges = [];
        this._dragVisited = new Set();
        this._applyEraser(idx);
        break;

      case 'rectangle':
        this._rectStart = { row, col };
        break;

      case 'line':
        this._lineStart = { row, col };
        break;

      case 'floodFill':
        this._applyFloodFill(idx);
        break;

      case 'startPoint':
        this._relocatePoint(idx, START);
        break;

      case 'endPoint':
        this._relocatePoint(idx, END);
        break;
    }
  }

  /**
   * Handle pointer move during drag.
   * @param {number} row
   * @param {number} col
   */
  handlePointerMove(row, col) {
    const maze = this.store.maze;
    if (!maze) return;

    const idx = rowColToIndex(row, col, maze.columns);
    const tool = this.store.editor.activeTool;

    if (this._isDragging) {
      if (tool === 'pencil') {
        this._applyPencil(idx);
      } else if (tool === 'eraser') {
        this._applyEraser(idx);
      }
    }
  }

  /**
   * Handle pointer up (end of drag or tool completion).
   * @param {number} row
   * @param {number} col
   */
  handlePointerUp(row, col) {
    const maze = this.store.maze;
    if (!maze) return;

    const tool = this.store.editor.activeTool;

    if (this._isDragging) {
      this._isDragging = false;
      if (this._dragChanges.length > 0) {
        this._commitOperation(this._dragChanges);
        this._dragChanges = [];
        this._dragVisited.clear();
      }
    } else if (tool === 'rectangle' && this._rectStart) {
      this._applyRectangle(this._rectStart, { row, col });
      this._rectStart = null;
    } else if (tool === 'line' && this._lineStart) {
      this._applyLine(this._lineStart, { row, col });
      this._lineStart = null;
    }

    // Debounced validation
    this._scheduleValidation();
  }

  /**
   * Apply pencil tool to a single cell.
   */
  _applyPencil(idx) {
    if (this._dragVisited.has(idx)) return;
    this._dragVisited.add(idx);

    const maze = this.store.maze;
    const currentValue = maze.cells[idx];

    // Protect Start/End
    if (currentValue === START || currentValue === END) return;

    const targetValue = this.store.editor.paintMode === 'wall' ? WALL : PATHWAY;
    if (currentValue === targetValue) return;

    const change = { index: idx, oldValue: currentValue, newValue: targetValue };
    this._dragChanges.push(change);
    this.store.updateCells([change]);
  }

  /**
   * Apply eraser tool (always converts to pathway).
   */
  _applyEraser(idx) {
    if (this._dragVisited.has(idx)) return;
    this._dragVisited.add(idx);

    const maze = this.store.maze;
    const currentValue = maze.cells[idx];

    if (currentValue === START || currentValue === END) return;
    if (currentValue === PATHWAY) return;

    const change = { index: idx, oldValue: currentValue, newValue: PATHWAY };
    this._dragChanges.push(change);
    this.store.updateCells([change]);
  }

  /**
   * Apply flood fill tool.
   */
  _applyFloodFill(startIdx) {
    const maze = this.store.maze;
    const originalValue = maze.cells[startIdx];

    if (originalValue === START || originalValue === END) return;

    const targetValue = this.store.editor.paintMode === 'wall' ? WALL : PATHWAY;
    if (originalValue === targetValue) return;

    // BFS flood fill (no edge wrapping for edit tool)
    const changes = [];
    const visited = new Uint8Array(maze.rows * maze.columns);
    const stack = [startIdx];

    while (stack.length > 0) {
      const idx = stack.pop();
      if (visited[idx]) continue;
      if (maze.cells[idx] !== originalValue) continue;
      if (maze.cells[idx] === START || maze.cells[idx] === END) continue;

      visited[idx] = 1;
      changes.push({ index: idx, oldValue: originalValue, newValue: targetValue });

      const row = Math.floor(idx / maze.columns);
      const col = idx % maze.columns;

      // Cardinal neighbors (no wrapping)
      if (row > 0) stack.push(idx - maze.columns);
      if (row < maze.rows - 1) stack.push(idx + maze.columns);
      if (col > 0) stack.push(idx - 1);
      if (col < maze.columns - 1) stack.push(idx + 1);
    }

    if (changes.length > 0) {
      this.store.updateCells(changes);
      this._commitOperation(changes);
    }
  }

  /**
   * Apply rectangle fill tool.
   */
  _applyRectangle(start, end) {
    const maze = this.store.maze;
    const targetValue = this.store.editor.paintMode === 'wall' ? WALL : PATHWAY;

    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);

    const changes = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const idx = rowColToIndex(r, c, maze.columns);
        const currentValue = maze.cells[idx];
        if (currentValue === START || currentValue === END) continue;
        if (currentValue === targetValue) continue;
        changes.push({ index: idx, oldValue: currentValue, newValue: targetValue });
      }
    }

    if (changes.length > 0) {
      this.store.updateCells(changes);
      this._commitOperation(changes);
    }
  }

  /**
   * Apply line tool using Bresenham's algorithm.
   */
  _applyLine(start, end) {
    const maze = this.store.maze;
    const targetValue = this.store.editor.paintMode === 'wall' ? WALL : PATHWAY;

    const cells = this._bresenham(start.row, start.col, end.row, end.col);
    const changes = [];

    for (const { row, col } of cells) {
      const idx = rowColToIndex(row, col, maze.columns);
      const currentValue = maze.cells[idx];
      if (currentValue === START || currentValue === END) continue;
      if (currentValue === targetValue) continue;
      changes.push({ index: idx, oldValue: currentValue, newValue: targetValue });
    }

    if (changes.length > 0) {
      this.store.updateCells(changes);
      this._commitOperation(changes);
    }
  }

  /**
   * Bresenham's line algorithm.
   */
  _bresenham(r0, c0, r1, c1) {
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

  /**
   * Relocate Start or End point.
   */
  _relocatePoint(targetIdx, pointType) {
    const maze = this.store.maze;
    const targetValue = maze.cells[targetIdx];

    // Must be a pathway cell
    if (targetValue === WALL) return;

    // Cannot place on the other point
    const otherType = pointType === START ? END : START;
    if (targetValue === otherType) return;

    // Already there
    if (targetValue === pointType) return;

    // Find current position of this point
    const currentIdx = findCellByValue(maze.cells, pointType);
    if (currentIdx === -1) return;

    const changes = [
      { index: currentIdx, oldValue: pointType, newValue: PATHWAY },
      { index: targetIdx, oldValue: targetValue, newValue: pointType },
    ];

    this.store.updateCells(changes);
    this._commitOperation(changes);
    this._scheduleValidation();
  }

  /**
   * Commit an edit operation to history.
   */
  _commitOperation(changes) {
    const operation = {
      type: changes.length === 1 ? 'single' : 'bulk',
      changes: [...changes],
      timestamp: Date.now(),
    };
    this.history.push(operation);
    this.store.setDirty(true);
  }

  /**
   * Undo the last operation.
   */
  undo() {
    const operation = this.history.undo();
    if (!operation) return;
    this.store.revertCells(operation.changes);
    this._scheduleValidation();
  }

  /**
   * Redo the last undone operation.
   */
  redo() {
    const operation = this.history.redo();
    if (!operation) return;
    this.store.updateCells(operation.changes);
    this._scheduleValidation();
  }

  /**
   * Schedule debounced solvability validation.
   */
  _scheduleValidation() {
    if (this._validationTimeout) {
      clearTimeout(this._validationTimeout);
    }
    this._validationTimeout = setTimeout(() => {
      this._validateSolvability();
      this._validationTimeout = null;
    }, 200);
  }

  /**
   * Check if the maze is solvable (Classic only).
   */
  _validateSolvability() {
    const maze = this.store.maze;
    if (!maze || maze.type !== 'classic') return;

    const startIdx = findCellByValue(maze.cells, START);
    const endIdx = findCellByValue(maze.cells, END);

    if (startIdx === -1 || endIdx === -1) {
      this.store.setPathValid(false);
      return;
    }

    const path = findPath(maze.cells, maze.columns, maze.rows, startIdx, endIdx, false);
    this.store.setPathValid(path !== null);
  }
}

/**
 * History Manager
 * Manages undo/redo stacks with configurable caps.
 */

const MAX_UNDO_STACK = 1000;
const MAX_SERIALIZABLE = 200;

export class HistoryManager {
  constructor() {
    /** @type {Array<import('../../types').EditOperation>} */
    this._undoStack = [];
    /** @type {Array<import('../../types').EditOperation>} */
    this._redoStack = [];
  }

  /**
   * Push a new operation onto the undo stack.
   * Clears the redo stack (new edit invalidates redo history).
   * Evicts oldest entry if stack exceeds cap.
   * @param {import('../../types').EditOperation} operation
   */
  push(operation) {
    this._undoStack.push(operation);
    this._redoStack = [];

    // FIFO eviction if over cap
    if (this._undoStack.length > MAX_UNDO_STACK) {
      this._undoStack.shift();
    }
  }

  /**
   * Undo the most recent operation.
   * @returns {import('../../types').EditOperation|null} The undone operation, or null if nothing to undo
   */
  undo() {
    if (this._undoStack.length === 0) return null;
    const operation = this._undoStack.pop();
    this._redoStack.push(operation);
    return operation;
  }

  /**
   * Redo the most recently undone operation.
   * @returns {import('../../types').EditOperation|null} The redone operation, or null if nothing to redo
   */
  redo() {
    if (this._redoStack.length === 0) return null;
    const operation = this._redoStack.pop();
    this._undoStack.push(operation);
    return operation;
  }

  /** @returns {boolean} */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /** @returns {boolean} */
  canRedo() {
    return this._redoStack.length > 0;
  }

  /** Clear all history (used on regeneration/new maze). */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }

  /**
   * Get the full in-memory stacks.
   * @returns {{ undo: Array, redo: Array }}
   */
  getStack() {
    return {
      undo: this._undoStack,
      redo: this._redoStack,
    };
  }

  /**
   * Replace stacks (used when loading a project).
   * @param {Array} undo
   * @param {Array} redo
   */
  setStack(undo, redo) {
    this._undoStack = undo.slice(-MAX_UNDO_STACK);
    this._redoStack = redo.slice(-MAX_UNDO_STACK);
  }

  /**
   * Get a trimmed copy of stacks for serialization.
   * @param {number} [maxDepth=200] - Maximum operations to include
   * @returns {{ undo: Array, redo: Array }}
   */
  getSerializableStack(maxDepth = MAX_SERIALIZABLE) {
    return {
      undo: this._undoStack.slice(-maxDepth),
      redo: this._redoStack.slice(-maxDepth),
    };
  }

  /** @returns {number} Current undo stack size */
  get undoSize() {
    return this._undoStack.length;
  }

  /** @returns {number} Current redo stack size */
  get redoSize() {
    return this._redoStack.length;
  }
}

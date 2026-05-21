/**
 * App Controller
 * Top-level orchestration: initializes all components and wires them together.
 */

import { StateStore } from '../state/store.js';
import { HistoryManager } from '../state/history.js';
import { CanvasRenderer } from '../rendering/canvas-renderer.js';
import { MinimapRenderer } from '../rendering/minimap-renderer.js';
import { OverlayRenderer } from '../rendering/overlay-renderer.js';
import { ToolPreviewRenderer } from '../rendering/tool-preview.js';
import { GenerationController } from './generation-controller.js';
import { EditController } from './edit-controller.js';
import { FileController } from './file-controller.js';
import { AutosaveManager } from '../io/autosave.js';
import { ConfigPanel } from '../ui/config-panel.js';
import { Toolbar } from '../ui/toolbar.js';
import { StatusBar } from '../ui/status-bar.js';
import { initKeyboard } from '../ui/keyboard.js';
import { showRecoveryPrompt, showConfirmation } from '../ui/modals.js';
import { gameObjects, activeObjectTool, placeGameObject, renderGameObjects } from '../ui/game-objects.js';

export class AppController {
  constructor() {
    // Core state
    this.store = new StateStore();
    this.history = new HistoryManager();

    // Canvas renderer
    const canvas = document.getElementById('maze-canvas');
    this.renderer = new CanvasRenderer(canvas, this.store);

    // Minimap
    const minimapCanvas = document.getElementById('minimap-canvas');
    this.minimap = new MinimapRenderer(minimapCanvas, this.store, this.renderer);

    // Overlays
    this.overlays = new OverlayRenderer(canvas, this.store);
    this.toolPreview = new ToolPreviewRenderer(canvas, this.store);

    // Controllers
    this.generation = new GenerationController(this.store, this.history);
    this.edit = new EditController(this.store, this.history, this.renderer);
    this.autosave = new AutosaveManager(this.store);
    this.file = new FileController(this.store, this.history, this.autosave);

    // UI components
    this.configPanel = new ConfigPanel(this.store);
    this.toolbar = new Toolbar(this.store, this.history);
    this.statusBar = new StatusBar(this.store);

    // Initialize
    this._bindCanvasEvents(canvas);
    this._bindUIEvents();
    this._bindStateListeners();
    initKeyboard({
      edit: this.edit,
      generation: this.generation,
      file: this.file,
      store: this.store,
      renderer: this.renderer,
    });

    // Wire overlay rendering after main render
    this.renderer.setOverlayCallback(() => {
      this.overlays.render();
      this.toolPreview.render();
      // Render game objects on top
      const ctx = this.renderer.canvas.getContext('2d');
      renderGameObjects(ctx, this.store);
    });

    // Start autosave
    this.autosave.start();

    // Check for recovery
    this._checkRecovery();

    // Unsaved changes warning
    window.addEventListener('beforeunload', (e) => {
      if (this.store.editor.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /**
   * Bind pointer events on the canvas.
   */
  _bindCanvasEvents(canvas) {
    let isPointerDown = false;

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = this.renderer.cellAtPixel(x, y);
      if (!cell) return;

      // If an object tool is active, place object instead of painting
      if (activeObjectTool) {
        const idx = cell.row * this.store.maze.columns + cell.col;
        placeGameObject(idx, activeObjectTool, this.store);
        return;
      }

      isPointerDown = true;
      canvas.setPointerCapture(e.pointerId);
      this.edit.handlePointerDown(cell.row, cell.col);
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = this.renderer.cellAtPixel(x, y);

      // Update coordinate display
      if (cell) {
        this.store.setCursorCell(cell);
        document.getElementById('coordinates').textContent = `(${cell.row}, ${cell.col})`;
      } else {
        this.store.setCursorCell(null);
        document.getElementById('coordinates').textContent = '--';
      }

      if (isPointerDown && cell) {
        this.edit.handlePointerMove(cell.row, cell.col);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = this.renderer.cellAtPixel(x, y);
      if (cell) {
        this.edit.handlePointerUp(cell.row, cell.col);
      }
    });

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.renderer.setZoom(this.store.view.zoom * delta);
    }, { passive: false });
  }

  /**
   * Bind UI button events.
   */
  _bindUIEvents() {
    // Header buttons
    document.getElementById('btn-save').addEventListener('click', () => this.file.saveProject());
    document.getElementById('btn-load').addEventListener('click', () => this.file.loadProject());
    document.getElementById('btn-export').addEventListener('click', () => this.file.exportASCII());
    document.getElementById('btn-import').addEventListener('click', () => this.file.importASCII());

    // Config panel - type selection
    document.querySelectorAll('input[name="maze-type"]').forEach((radio) => {
      radio.addEventListener('change', () => this._updateConfigVisibility());
    });
    document.querySelectorAll('input[name="classic-subtype"]').forEach((radio) => {
      radio.addEventListener('change', () => this._updateConfigVisibility());
    });

    // Generate / Regenerate
    document.getElementById('btn-generate').addEventListener('click', () => this._handleGenerate());
    document.getElementById('btn-regenerate').addEventListener('click', () => this._handleRegenerate());

    // Seed copy
    document.getElementById('btn-copy-seed').addEventListener('click', () => {
      const seed = this.store.maze?.seed;
      if (seed != null) {
        navigator.clipboard.writeText(String(seed));
      }
    });

    // Sliders
    document.getElementById('slider-density').addEventListener('input', (e) => {
      document.getElementById('density-value').textContent = (e.target.value / 100).toFixed(1);
    });
    document.getElementById('slider-dead-ends').addEventListener('input', (e) => {
      document.getElementById('dead-ends-value').textContent = (e.target.value / 100).toFixed(1);
    });

    // Toolbar - tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.setEditorTool(btn.dataset.tool);
      });
    });

    // Paint mode toggle
    document.getElementById('btn-paint-mode').addEventListener('click', () => {
      this.store.togglePaintMode();
    });

    // Undo/Redo buttons
    document.getElementById('btn-undo').addEventListener('click', () => this.edit.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.edit.redo());

    // Visualization toggles
    document.getElementById('check-path').addEventListener('change', () => this.store.togglePathOverlay());
    document.getElementById('check-unreachable').addEventListener('change', () => this.store.toggleUnreachable());
    document.getElementById('check-grid').addEventListener('change', () => this.store.toggleGridLines());
  }

  /**
   * Bind state change listeners for UI updates.
   */
  _bindStateListeners() {
    // Maze replaced - update seed input
    this.store.subscribe('maze-replaced', (maze) => {
      document.getElementById('input-seed').value = maze.seed;
      // Show/hide minimap
      document.getElementById('minimap-canvas').hidden = !(maze.rows > 30 || maze.columns > 30);
      // Show/hide object tools (Pac-Man only)
      document.getElementById('object-tools').hidden = maze.type !== 'pacman';
      // Clear game objects on new maze
      gameObjects.clear();
      document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
    });

    // Re-render when objects are placed/removed
    this.store.subscribe('objects-changed', () => {
      this.renderer.render();
    });
  }

  /**
   * Update undo/redo button disabled state.
   */
  _updateUndoRedoButtons() {
    document.getElementById('btn-undo').disabled = !this.history.canUndo();
    document.getElementById('btn-redo').disabled = !this.history.canRedo();
  }

  /**
   * Update config panel visibility based on selected type.
   */
  _updateConfigVisibility() {
    const type = document.querySelector('input[name="maze-type"]:checked')?.value;

    document.getElementById('classic-sub-options').hidden = type !== 'classic';
    document.getElementById('section-dead-ends').hidden = !(
      type === 'classic' &&
      document.getElementById('subtype-imperfect').checked
    );
    document.getElementById('section-symmetry').hidden = type !== 'pacman';
  }

  /**
   * Handle Generate button click.
   */
  _handleGenerate() {
    const config = this.configPanel.readConfig();
    const result = this.generation.generate(config);

    if (!result.success) {
      const errorEl = document.getElementById('dim-error');
      errorEl.textContent = result.error;
      errorEl.hidden = false;
      setTimeout(() => { errorEl.hidden = true; }, 5000);
    } else {
      document.getElementById('dim-error').hidden = true;
    }
  }

  /**
   * Handle Regenerate button click.
   */
  async _handleRegenerate() {
    if (this.store.editor.isDirty) {
      const choice = await showConfirmation(
        'Regenerating will discard all edits. Continue?',
        { showSave: false }
      );
      if (choice === 'cancel') return;
    }

    const result = this.generation.regenerate();
    if (!result.success) {
      const errorEl = document.getElementById('dim-error');
      errorEl.textContent = result.error;
      errorEl.hidden = false;
    }
  }

  /**
   * Check for autosave recovery data on startup.
   */
  async _checkRecovery() {
    if (!this.autosave.hasRecoveryData()) return;

    const restore = await showRecoveryPrompt();
    if (restore) {
      const maze = this.autosave.getRecoveryData();
      if (maze) {
        this.store.setMazeState(maze);
        this.store.setDirty(true);
      }
    }
    this.autosave.clearRecoveryData();
  }
}

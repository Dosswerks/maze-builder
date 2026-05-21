/**
 * File Controller
 * Orchestrates save, load, export, and import operations.
 */

import { saveFile, openFile, FILE_TYPES } from '../io/file-access.js';
import { generateASCII, getSuggestedFilename } from '../io/ascii-exporter.js';
import { parseASCII } from '../io/ascii-importer.js';
import { serializeProject, deserializeProject, getProjectFilename } from '../io/project-serializer.js';
import { showExportPreview, showConfirmation, showError, showTypeSelection } from '../ui/modals.js';

export class FileController {
  /**
   * @param {import('../state/store.js').StateStore} store
   * @param {import('../state/history.js').HistoryManager} history
   * @param {import('../io/autosave.js').AutosaveManager} autosave
   */
  constructor(store, history, autosave) {
    this.store = store;
    this.history = history;
    this.autosave = autosave;
  }

  /**
   * Save the current project.
   */
  async saveProject() {
    const maze = this.store.maze;
    if (!maze) return;

    const historyStack = this.history.getSerializableStack(200);
    const content = serializeProject(maze, historyStack);
    const filename = getProjectFilename(maze);

    const result = await saveFile(content, filename, FILE_TYPES.project);
    if (result.success) {
      this.store.setDirty(false);
      this.autosave.clearRecoveryData();
    } else if (result.error !== 'cancelled') {
      await showError('Save Failed', result.error);
    }
  }

  /**
   * Save project to a new file.
   */
  async saveProjectAs() {
    return this.saveProject(); // Same flow, FSAA always prompts for new location
  }

  /**
   * Load a project file.
   */
  async loadProject() {
    // Check for unsaved changes
    if (this.store.editor.isDirty) {
      const choice = await showConfirmation(
        'You have unsaved changes. What would you like to do?'
      );
      if (choice === 'cancel') return;
      if (choice === 'save') await this.saveProject();
    }

    const result = await openFile(FILE_TYPES.project);
    if (!result.success) {
      if (result.error !== 'cancelled') {
        await showError('Open Failed', result.error);
      }
      return;
    }

    const parsed = deserializeProject(result.content);
    if (!parsed.success) {
      await showError('Invalid Project File', parsed.error);
      return;
    }

    if (parsed.warning) {
      // Show warning but continue
      console.warn(parsed.warning);
    }

    // Restore state
    this.store.setMazeState(parsed.data.maze);
    this.history.setStack(
      parsed.data.editor.undoStack,
      parsed.data.editor.redoStack
    );
    this.store.setDirty(false);
    this.autosave.clearRecoveryData();
  }

  /**
   * Export maze as ASCII text file.
   */
  async exportASCII() {
    const maze = this.store.maze;
    if (!maze) return;

    const ascii = generateASCII(maze);

    // Show preview
    const confirmed = await showExportPreview(ascii);
    if (!confirmed) return;

    const filename = getSuggestedFilename(maze);
    const result = await saveFile(ascii, filename, FILE_TYPES.ascii);

    if (!result.success && result.error !== 'cancelled') {
      await showError('Export Failed', result.error);
    }
  }

  /**
   * Import an ASCII maze file.
   */
  async importASCII() {
    // Check for unsaved changes
    if (this.store.editor.isDirty) {
      const choice = await showConfirmation(
        'You have unsaved changes. Importing will replace the current maze.'
      );
      if (choice === 'cancel') return;
      if (choice === 'save') await this.saveProject();
    }

    const result = await openFile(FILE_TYPES.ascii);
    if (!result.success) {
      if (result.error !== 'cancelled') {
        await showError('Import Failed', result.error);
      }
      return;
    }

    const parsed = parseASCII(result.content);
    if (!parsed.success) {
      const errorMsg = parsed.errors.map((e) => e.detail).join('\n');
      await showError('Import Validation Failed', errorMsg);
      return;
    }

    // Handle type prompt if needed
    let mazeType = parsed.maze.type;
    if (parsed.needsTypePrompt || !mazeType) {
      mazeType = await showTypeSelection();
      if (!mazeType) return; // cancelled
    }

    // Build maze state
    const mazeState = {
      type: mazeType,
      subType: mazeType === 'classic' ? 'imperfect' : null, // default for imports
      rows: parsed.maze.rows,
      columns: parsed.maze.columns,
      seed: parsed.maze.seed || 0,
      cells: parsed.maze.cells,
      metadata: new Map(),
      config: { density: 0.5, deadEndFrequency: 0.3, symmetry: 'none', edgeWrapping: false },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    this.store.setMazeState(mazeState);
    this.history.clear();
    this.store.setDirty(false);

    // Show unsolvable warning if applicable
    if (parsed.unsolvable) {
      this.store.setPathValid(false);
    }
  }
}

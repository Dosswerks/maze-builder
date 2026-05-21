/**
 * Generation Controller
 * Orchestrates maze generation, validation, and state updates.
 */

import { generateClassicMaze } from '../algorithms/classic-generator.js';
import { generatePacMan } from '../algorithms/pacman-generator.js';
import { checkConfigFeasibility } from '../algorithms/validator.js';
import { randomSeed } from '../algorithms/rng.js';

/**
 * @param {import('../state/store.js').StateStore} store
 * @param {import('../state/history.js').HistoryManager} history
 */
export class GenerationController {
  constructor(store, history) {
    this.store = store;
    this.history = history;
  }

  /**
   * Validate generation config and return errors if any.
   * @param {object} config
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateConfig(config) {
    const errors = [];

    if (!config.type) {
      errors.push('Please select a maze type before generating.');
      return { valid: false, errors };
    }

    if (config.type === 'classic' && !config.subType) {
      errors.push('Please select Perfect or Imperfect for Classic maze.');
      return { valid: false, errors };
    }

    const rows = parseInt(config.rows, 10);
    const cols = parseInt(config.columns, 10);

    if (isNaN(rows) || rows < 5 || rows > 100) {
      errors.push('Rows must be an integer between 5 and 100.');
    }
    if (isNaN(cols) || cols < 5 || cols > 100) {
      errors.push('Columns must be an integer between 5 and 100.');
    }

    if (errors.length > 0) return { valid: false, errors };

    // Check feasibility
    const feasibility = checkConfigFeasibility(rows, cols, config);
    if (!feasibility.feasible) {
      errors.push(feasibility.reason);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate a maze from the given configuration.
   * @param {object} config - { type, subType, rows, columns, seed, density, deadEndFrequency, symmetry, edgeWrapping }
   * @returns {{ success: boolean, error?: string }}
   */
  generate(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('\n') };
    }

    const rows = parseInt(config.rows, 10);
    const columns = parseInt(config.columns, 10);
    const seed = config.seed ? parseInt(config.seed, 10) : randomSeed();
    const density = config.density ?? 0.5;
    const deadEndFrequency = config.deadEndFrequency ?? 0.3;
    const symmetry = config.symmetry || 'none';
    const edgeWrapping = config.edgeWrapping || false;

    let result;

    if (config.type === 'classic') {
      result = generateClassicMaze(rows, columns, {
        type: config.type,
        subType: config.subType,
        density,
        deadEndFrequency,
      }, seed);
    } else {
      result = generatePacMan(rows, columns, {
        symmetry,
        edgeWrapping,
      }, seed);
    }

    if (!result.cells) {
      return { success: false, error: result.error || 'Generation failed.' };
    }

    // Update state
    const mazeState = {
      type: config.type,
      subType: config.subType || null,
      rows,
      columns,
      seed: result.seed,
      cells: result.cells,
      metadata: new Map(),
      config: { density, deadEndFrequency, symmetry, edgeWrapping },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    this.store.setMazeState(mazeState);
    this.history.clear();
    this.store.setDirty(false);
    this.store.setPathValid(config.type === 'classic' ? true : null);

    return { success: true };
  }

  /**
   * Regenerate with a new random seed, keeping current config.
   * @returns {{ success: boolean, error?: string }}
   */
  regenerate() {
    if (!this.store.maze) {
      return { success: false, error: 'No maze to regenerate. Generate one first.' };
    }

    const maze = this.store.maze;
    const config = {
      type: maze.type,
      subType: maze.subType,
      rows: maze.rows,
      columns: maze.columns,
      seed: null, // new random seed
      density: maze.config.density,
      deadEndFrequency: maze.config.deadEndFrequency,
      symmetry: maze.config.symmetry,
      edgeWrapping: maze.config.edgeWrapping,
    };

    return this.generate(config);
  }
}

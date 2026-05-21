/**
 * Maze Validator
 * Validates generated mazes against correctness properties.
 */

import { getCardinalNeighbors } from './neighbors.js';
import { floodFill, findPath, isCycleFree, countPathwayCells, findCellByValue } from './pathfinder.js';

const WALL = 0;
const PATHWAY = 1;
const START = 2;
const END = 3;

/**
 * Validate a Classic Perfect maze (connected, cycle-free, solvable).
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateClassicPerfect(cells, rows, columns) {
  const errors = [];
  const edgeWrapping = false;

  // Find start and end
  const startIdx = findCellByValue(cells, START);
  const endIdx = findCellByValue(cells, END);

  if (startIdx === -1) errors.push('Missing Start_Point');
  if (endIdx === -1) errors.push('Missing End_Point');
  if (errors.length > 0) return { valid: false, errors };

  // Check connectivity
  const { count } = floodFill(cells, columns, rows, startIdx, edgeWrapping);
  const totalPathway = countPathwayCells(cells);
  if (count !== totalPathway) {
    errors.push(`Disconnected regions: ${count} reachable of ${totalPathway} pathway cells`);
  }

  // Check cycle-free (spanning tree)
  if (!isCycleFree(cells, rows, columns, edgeWrapping)) {
    errors.push('Maze contains cycles (not a perfect maze)');
  }

  // Check solvability
  const path = findPath(cells, columns, rows, startIdx, endIdx, edgeWrapping);
  if (!path) {
    errors.push('No path from Start to End');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a Classic Imperfect maze (connected, solvable).
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateClassicImperfect(cells, rows, columns) {
  const errors = [];
  const edgeWrapping = false;

  const startIdx = findCellByValue(cells, START);
  const endIdx = findCellByValue(cells, END);

  if (startIdx === -1) errors.push('Missing Start_Point');
  if (endIdx === -1) errors.push('Missing End_Point');
  if (errors.length > 0) return { valid: false, errors };

  // Check connectivity
  const { count } = floodFill(cells, columns, rows, startIdx, edgeWrapping);
  const totalPathway = countPathwayCells(cells);
  if (count !== totalPathway) {
    errors.push(`Disconnected regions: ${count} reachable of ${totalPathway} pathway cells`);
  }

  // Check solvability
  const path = findPath(cells, columns, rows, startIdx, endIdx, edgeWrapping);
  if (!path) {
    errors.push('No path from Start to End');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a Pac-Man braid maze.
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @param {{ edgeWrapping: boolean }} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePacMan(cells, rows, columns, config) {
  const errors = [];
  const edgeWrapping = config.edgeWrapping || false;
  const size = rows * columns;

  // Find first pathway cell for connectivity check
  let firstPathway = -1;
  for (let i = 0; i < size; i++) {
    if (cells[i] !== WALL) {
      firstPathway = i;
      break;
    }
  }

  if (firstPathway === -1) {
    errors.push('No pathway cells found');
    return { valid: false, errors };
  }

  // Check connectivity
  const { count } = floodFill(cells, columns, rows, firstPathway, edgeWrapping);
  const totalPathway = countPathwayCells(cells);
  if (count !== totalPathway) {
    errors.push(`Disconnected regions: ${count} reachable of ${totalPathway} pathway cells`);
  }

  // Check no dead ends (every pathway cell must have ≥2 pathway neighbors)
  for (let i = 0; i < size; i++) {
    if (cells[i] === WALL) continue;
    const neighbors = getCardinalNeighbors(i, columns, rows, edgeWrapping);
    let pathwayNeighborCount = 0;
    for (const n of neighbors) {
      if (cells[n] !== WALL) pathwayNeighborCount++;
    }
    if (pathwayNeighborCount < 2) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      errors.push(`Dead end at (${row}, ${col})`);
    }
  }

  // Check no 2x2 rooms
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < columns - 1; c++) {
      const tl = r * columns + c;
      const tr = tl + 1;
      const bl = (r + 1) * columns + c;
      const br = bl + 1;
      if (cells[tl] !== WALL && cells[tr] !== WALL &&
          cells[bl] !== WALL && cells[br] !== WALL) {
        errors.push(`2x2 room at (${r}, ${c})`);
      }
    }
  }

  // Check wrapping boundary 2x2 rooms if wrapping enabled
  if (edgeWrapping) {
    // Check right-edge wrap (last col + first col)
    for (let r = 0; r < rows - 1; r++) {
      const tl = r * columns + (columns - 1);
      const tr = r * columns; // wraps to col 0
      const bl = (r + 1) * columns + (columns - 1);
      const br = (r + 1) * columns;
      if (cells[tl] !== WALL && cells[tr] !== WALL &&
          cells[bl] !== WALL && cells[br] !== WALL) {
        errors.push(`2x2 room at wrap boundary row ${r}`);
      }
    }
    // Check bottom-edge wrap (last row + first row)
    for (let c = 0; c < columns - 1; c++) {
      const tl = (rows - 1) * columns + c;
      const tr = tl + 1;
      const bl = c; // wraps to row 0
      const br = c + 1;
      if (cells[tl] !== WALL && cells[tr] !== WALL &&
          cells[bl] !== WALL && cells[br] !== WALL) {
        errors.push(`2x2 room at wrap boundary col ${c}`);
      }
    }
  }

  // Check ≥30% pathway coverage
  const coverage = totalPathway / size;
  if (coverage < 0.3) {
    errors.push(`Pathway coverage ${(coverage * 100).toFixed(1)}% is below 30% minimum`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a configuration is feasible before attempting generation.
 * @param {number} rows
 * @param {number} columns
 * @param {{ type: string, subType?: string, symmetry?: string, edgeWrapping?: boolean }} config
 * @returns {{ feasible: boolean, reason: string|null }}
 */
export function checkConfigFeasibility(rows, columns, config) {
  if (config.type === 'pacman') {
    // Both-axis symmetry requires odd dimensions for center axis
    if (config.symmetry === 'both') {
      if (rows < 7 || columns < 7) {
        return {
          feasible: false,
          reason: 'Both-axis symmetry requires at least 7×7 grid to satisfy braid constraints.',
        };
      }
    }
    if (config.symmetry === 'horizontal' && columns < 7) {
      return {
        feasible: false,
        reason: 'Horizontal symmetry requires at least 7 columns.',
      };
    }
    if (config.symmetry === 'vertical' && rows < 7) {
      return {
        feasible: false,
        reason: 'Vertical symmetry requires at least 7 rows.',
      };
    }
  }

  return { feasible: true, reason: null };
}

/**
 * Check for enclosed unreachable pathway regions.
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @param {boolean} edgeWrapping
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateNoEnclosedRegions(cells, rows, columns, edgeWrapping) {
  const errors = [];
  const size = rows * columns;

  // Find first pathway cell
  let firstPathway = -1;
  for (let i = 0; i < size; i++) {
    if (cells[i] !== WALL) {
      firstPathway = i;
      break;
    }
  }

  if (firstPathway === -1) return { valid: true, errors };

  const { connected, count } = floodFill(cells, columns, rows, firstPathway, edgeWrapping);
  const totalPathway = countPathwayCells(cells);

  if (count !== totalPathway) {
    errors.push(`${totalPathway - count} pathway cells are enclosed/unreachable`);
  }

  return { valid: errors.length === 0, errors };
}

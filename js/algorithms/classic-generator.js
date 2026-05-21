/**
 * Classic Maze Generator
 * Implements Perfect (DFS backtracker) and Imperfect (DFS + wall removal) generation.
 */

import { getCardinalNeighbors, rowColToIndex, indexToRowCol } from './neighbors.js';
import { validateClassicPerfect, validateClassicImperfect } from './validator.js';
import { mulberry32 } from './rng.js';

const WALL = 0;
const PATHWAY = 1;
const START = 2;
const END = 3;

/**
 * Generate a Classic Perfect maze using iterative DFS backtracker.
 * @param {number} rows - Grid rows (5-100)
 * @param {number} columns - Grid columns (5-100)
 * @param {{ density: number }} config - Generation config
 * @param {() => number} rng - Seeded RNG function
 * @returns {Uint8Array} Cell states array
 */
export function generateClassicPerfect(rows, columns, config, rng) {
  const cells = new Uint8Array(rows * columns); // all walls (0)
  const density = config.density ?? 0.5;

  // Use odd-indexed cells as the carving grid
  // This ensures walls between passages
  const carvableRows = [];
  const carvableCols = [];
  for (let r = 1; r < rows - 1; r += 2) carvableRows.push(r);
  for (let c = 1; c < columns - 1; c += 2) carvableCols.push(c);

  if (carvableRows.length === 0 || carvableCols.length === 0) {
    // Grid too small for standard carving, fill minimally
    cells[rowColToIndex(1, 1, columns)] = PATHWAY;
    return cells;
  }

  // Track visited carving cells
  const visited = new Uint8Array(carvableRows.length * carvableCols.length);

  // Convert carving grid coords to actual grid index
  function carvingToIndex(cr, cc) {
    return rowColToIndex(carvableRows[cr], carvableCols[cc], columns);
  }

  // Convert carving grid coords to carving flat index
  function carvingFlatIdx(cr, cc) {
    return cr * carvableCols.length + cc;
  }

  // Directions: [dRow, dCol] in carving grid space
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Start from random carving cell
  const startCR = Math.floor(rng() * carvableRows.length);
  const startCC = Math.floor(rng() * carvableCols.length);

  // Mark start as pathway
  cells[carvingToIndex(startCR, startCC)] = PATHWAY;
  visited[carvingFlatIdx(startCR, startCC)] = 1;

  // Iterative DFS with density-biased direction selection
  const stack = [{ cr: startCR, cc: startCC, lastDir: -1 }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { cr, cc, lastDir } = current;

    // Find unvisited neighbors
    const unvisited = [];
    for (let d = 0; d < 4; d++) {
      const nr = cr + directions[d][0];
      const nc = cc + directions[d][1];
      if (nr >= 0 && nr < carvableRows.length && nc >= 0 && nc < carvableCols.length) {
        if (!visited[carvingFlatIdx(nr, nc)]) {
          unvisited.push(d);
        }
      }
    }

    if (unvisited.length === 0) {
      // Backtrack
      stack.pop();
      continue;
    }

    // Density-biased direction selection
    let chosenDir;
    if (lastDir >= 0 && unvisited.includes(lastDir) && rng() > density) {
      // Low density: prefer continuing in same direction
      chosenDir = lastDir;
    } else {
      // Shuffle and pick random
      chosenDir = unvisited[Math.floor(rng() * unvisited.length)];
    }

    const nr = cr + directions[chosenDir][0];
    const nc = cc + directions[chosenDir][1];

    // Carve the passage (the wall between current and neighbor)
    const wallRow = (carvableRows[cr] + carvableRows[nr]) / 2;
    const wallCol = (carvableCols[cc] + carvableCols[nc]) / 2;
    cells[rowColToIndex(wallRow, wallCol, columns)] = PATHWAY;

    // Carve the neighbor cell
    cells[carvingToIndex(nr, nc)] = PATHWAY;
    visited[carvingFlatIdx(nr, nc)] = 1;

    // Push neighbor onto stack
    stack.push({ cr: nr, cc: nc, lastDir: chosenDir });
  }

  // Place Start and End on opposing edges
  placeStartEnd(cells, rows, columns, rng);

  return cells;
}

/**
 * Place Start on top/left edge and End on bottom/right edge (opposing).
 */
function placeStartEnd(cells, rows, columns, rng) {
  // Decide axis: 0 = top/bottom, 1 = left/right
  const axis = rng() < 0.5 ? 0 : 1;

  if (axis === 0) {
    // Start on top edge, End on bottom edge
    const topPathways = [];
    for (let c = 0; c < columns; c++) {
      if (cells[rowColToIndex(1, c, columns)] === PATHWAY) {
        topPathways.push(c);
      }
    }
    const bottomPathways = [];
    for (let c = 0; c < columns; c++) {
      if (cells[rowColToIndex(rows - 2, c, columns)] === PATHWAY) {
        bottomPathways.push(c);
      }
    }

    if (topPathways.length > 0 && bottomPathways.length > 0) {
      const startCol = topPathways[Math.floor(rng() * topPathways.length)];
      const endCol = bottomPathways[Math.floor(rng() * bottomPathways.length)];

      // Open edge wall and place marker
      const startIdx = rowColToIndex(0, startCol, columns);
      cells[startIdx] = START;

      const endIdx = rowColToIndex(rows - 1, endCol, columns);
      cells[endIdx] = END;
    } else {
      // Fallback: place on first available pathway cells near edges
      placeFallbackStartEnd(cells, rows, columns);
    }
  } else {
    // Start on left edge, End on right edge
    const leftPathways = [];
    for (let r = 0; r < rows; r++) {
      if (cells[rowColToIndex(r, 1, columns)] === PATHWAY) {
        leftPathways.push(r);
      }
    }
    const rightPathways = [];
    for (let r = 0; r < rows; r++) {
      if (cells[rowColToIndex(r, columns - 2, columns)] === PATHWAY) {
        rightPathways.push(r);
      }
    }

    if (leftPathways.length > 0 && rightPathways.length > 0) {
      const startRow = leftPathways[Math.floor(rng() * leftPathways.length)];
      const endRow = rightPathways[Math.floor(rng() * rightPathways.length)];

      const startIdx = rowColToIndex(startRow, 0, columns);
      cells[startIdx] = START;

      const endIdx = rowColToIndex(endRow, columns - 1, columns);
      cells[endIdx] = END;
    } else {
      placeFallbackStartEnd(cells, rows, columns);
    }
  }
}

/**
 * Fallback Start/End placement when edge placement fails.
 */
function placeFallbackStartEnd(cells, rows, columns) {
  // Place Start at first pathway cell near top-left
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === PATHWAY) {
      cells[i] = START;
      break;
    }
  }
  // Place End at last pathway cell near bottom-right
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i] === PATHWAY) {
      cells[i] = END;
      break;
    }
  }
}

/**
 * Generate a Classic Imperfect maze (perfect maze + wall removal for cycles).
 * @param {number} rows
 * @param {number} columns
 * @param {{ density: number, deadEndFrequency: number }} config
 * @param {() => number} rng
 * @returns {Uint8Array}
 */
export function generateClassicImperfect(rows, columns, config, rng) {
  // Start with a perfect maze
  const cells = generateClassicPerfect(rows, columns, { density: config.density ?? 0.5 }, rng);

  const imperfectDensity = config.density ?? 0.5;
  const deadEndFreq = config.deadEndFrequency ?? 0.3;

  // Find eligible walls: walls that separate two pathway/start/end cells
  const eligible = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < columns - 1; c++) {
      const idx = rowColToIndex(r, c, columns);
      if (cells[idx] !== WALL) continue;

      // Check if this wall separates two non-wall cells horizontally or vertically
      const up = r > 0 ? cells[rowColToIndex(r - 1, c, columns)] : WALL;
      const down = r < rows - 1 ? cells[rowColToIndex(r + 1, c, columns)] : WALL;
      const left = c > 0 ? cells[rowColToIndex(r, c - 1, columns)] : WALL;
      const right = c < columns - 1 ? cells[rowColToIndex(r, c + 1, columns)] : WALL;

      if ((up !== WALL && down !== WALL) || (left !== WALL && right !== WALL)) {
        eligible.push(idx);
      }
    }
  }

  // Shuffle eligible walls
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  // Remove walls proportional to density
  const targetRemovals = Math.floor(imperfectDensity * eligible.length);
  for (let i = 0; i < targetRemovals && i < eligible.length; i++) {
    cells[eligible[i]] = PATHWAY;
  }

  // Apply dead-end frequency: remove more walls at dead ends if needed
  if (deadEndFreq < 1.0) {
    removeDeadEnds(cells, rows, columns, deadEndFreq, rng);
  }

  return cells;
}

/**
 * Remove dead ends based on frequency parameter.
 */
function removeDeadEnds(cells, rows, columns, deadEndFreq, rng) {
  const edgeWrapping = false;
  let iterations = 0;
  const maxIterations = 1000;

  while (iterations < maxIterations) {
    iterations++;
    const deadEnds = [];

    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === WALL) continue;
      if (cells[i] === START || cells[i] === END) continue;

      const neighbors = getCardinalNeighbors(i, columns, rows, edgeWrapping);
      let pathwayCount = 0;
      for (const n of neighbors) {
        if (cells[n] !== WALL) pathwayCount++;
      }
      if (pathwayCount === 1) deadEnds.push(i);
    }

    if (deadEnds.length === 0) break;

    // Keep some dead ends based on frequency
    const toRemove = Math.floor(deadEnds.length * (1 - deadEndFreq));
    if (toRemove === 0) break;

    // Shuffle and remove walls adjacent to dead ends
    for (let i = deadEnds.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
    }

    let removed = 0;
    for (const deadEnd of deadEnds) {
      if (removed >= toRemove) break;

      const neighbors = getCardinalNeighbors(deadEnd, columns, rows, edgeWrapping);
      // Find a wall neighbor that has a pathway on the other side
      for (const n of neighbors) {
        if (cells[n] === WALL) {
          const { row, col } = indexToRowCol(n, columns);
          if (row > 0 && row < rows - 1 && col > 0 && col < columns - 1) {
            cells[n] = PATHWAY;
            removed++;
            break;
          }
        }
      }
    }

    if (removed === 0) break;
  }
}

/**
 * Generate a classic maze with validation and retry logic.
 * @param {number} rows
 * @param {number} columns
 * @param {{ type: string, subType: string, density: number, deadEndFrequency: number }} config
 * @param {number} seed
 * @returns {{ cells: Uint8Array|null, seed: number, error?: string }}
 */
export function generateClassicMaze(rows, columns, config, seed) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentSeed = seed + attempt;
    const rng = mulberry32(currentSeed);

    let cells;
    if (config.subType === 'perfect') {
      cells = generateClassicPerfect(rows, columns, config, rng);
    } else {
      cells = generateClassicImperfect(rows, columns, config, rng);
    }

    // Validate
    const validation = config.subType === 'perfect'
      ? validateClassicPerfect(cells, rows, columns)
      : validateClassicImperfect(cells, rows, columns);

    if (validation.valid) {
      return { cells, seed: currentSeed };
    }
  }

  return { cells: null, seed, error: 'Failed to generate valid maze after 10 attempts' };
}

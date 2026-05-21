/**
 * Pac-Man Braid Maze Generator
 * Kruskal's spanning tree + dead-end removal + symmetry + edge wrapping.
 */

import { getCardinalNeighbors, rowColToIndex, indexToRowCol } from './neighbors.js';
import { validatePacMan } from './validator.js';
import { mulberry32 } from './rng.js';

const WALL = 0;
const PATHWAY = 1;

/**
 * Union-Find data structure for Kruskal's algorithm.
 */
class UnionFind {
  constructor(size) {
    this.parent = new Int32Array(size);
    this.rank = new Uint8Array(size);
    for (let i = 0; i < size; i++) this.parent[i] = i;
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path compression
      x = this.parent[x];
    }
    return x;
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    return true;
  }

  connected(a, b) {
    return this.find(a) === this.find(b);
  }
}

/**
 * Generate a Pac-Man braid maze.
 * @param {number} rows
 * @param {number} columns
 * @param {{ density?: number, symmetry?: string, edgeWrapping?: boolean }} config
 * @param {() => number} rng
 * @returns {Uint8Array}
 */
export function generatePacManMaze(rows, columns, config, rng) {
  const symmetry = config.symmetry || 'none';
  const edgeWrapping = config.edgeWrapping || 'none';

  let cells;

  if (symmetry === 'none') {
    cells = generateBraidFull(rows, columns, edgeWrapping, rng);
  } else {
    cells = generateBraidSymmetric(rows, columns, symmetry, edgeWrapping, rng);
  }

  // Apply edge wrapping connections if enabled
  if (edgeWrapping && edgeWrapping !== 'none') {
    var wrappedCells = applyEdgeWrapping(cells, rows, columns, edgeWrapping, rng);
  }

  // Remove any remaining dead ends
  eliminateDeadEnds(cells, rows, columns, edgeWrapping, rng);

  // Repair 2x2 rooms (protect edge-wrap tunnel cells)
  repair2x2Rooms(cells, rows, columns, edgeWrapping, wrappedCells);

  return cells;
}

/**
 * Generate a full braid maze using Kruskal's + dead-end removal.
 */
function generateBraidFull(rows, columns, edgeWrapping, rng) {
  const size = rows * columns;
  const cells = new Uint8Array(size); // all walls

  // Use odd-indexed cells as nodes for Kruskal's
  const nodes = [];
  const nodeIndex = new Int32Array(size).fill(-1);

  for (let r = 1; r < rows - 1; r += 2) {
    for (let c = 1; c < columns - 1; c += 2) {
      const idx = rowColToIndex(r, c, columns);
      nodeIndex[idx] = nodes.length;
      nodes.push(idx);
      cells[idx] = PATHWAY;
    }
  }

  // Build edges between adjacent nodes (walls between them)
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    const { row, col } = indexToRowCol(nodes[i], columns);

    // Right neighbor node
    if (col + 2 < columns - 1) {
      const rightNode = nodeIndex[rowColToIndex(row, col + 2, columns)];
      if (rightNode >= 0) {
        edges.push({ a: i, b: rightNode, wall: rowColToIndex(row, col + 1, columns) });
      }
    }

    // Down neighbor node
    if (row + 2 < rows - 1) {
      const downNode = nodeIndex[rowColToIndex(row + 2, col, columns)];
      if (downNode >= 0) {
        edges.push({ a: i, b: downNode, wall: rowColToIndex(row + 1, col, columns) });
      }
    }
  }

  // Shuffle edges (Fisher-Yates)
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  // Kruskal's: build spanning tree
  const uf = new UnionFind(nodes.length);
  for (const edge of edges) {
    if (uf.union(edge.a, edge.b)) {
      cells[edge.wall] = PATHWAY;
    }
  }

  // Now remove additional walls to eliminate dead ends
  // First pass: open remaining edges that weren't used in spanning tree
  for (const edge of edges) {
    if (cells[edge.wall] === WALL) {
      // Check if opening this wall would help eliminate a dead end
      const aIdx = nodes[edge.a];
      const bIdx = nodes[edge.b];
      const aNeighbors = countPathwayNeighbors(cells, aIdx, columns, rows, edgeWrapping);
      const bNeighbors = countPathwayNeighbors(cells, bIdx, columns, rows, edgeWrapping);

      if (aNeighbors < 2 || bNeighbors < 2) {
        cells[edge.wall] = PATHWAY;
      }
    }
  }

  return cells;
}

/**
 * Generate a symmetric braid maze.
 */
function generateBraidSymmetric(rows, columns, symmetry, edgeWrapping, rng) {
  let genRows = rows;
  let genCols = columns;

  if (symmetry === 'horizontal' || symmetry === 'both') {
    genCols = Math.ceil(columns / 2);
  }
  if (symmetry === 'vertical' || symmetry === 'both') {
    genRows = Math.ceil(rows / 2);
  }

  // Generate the partial maze
  const partial = generateBraidFull(genRows, genCols, false, rng);

  // Mirror to full size
  const size = rows * columns;
  const cells = new Uint8Array(size);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      let srcR = r;
      let srcC = c;

      if (symmetry === 'horizontal' || symmetry === 'both') {
        if (c >= genCols) {
          srcC = columns - 1 - c;
          if (srcC >= genCols) srcC = genCols - 1;
        }
      }
      if (symmetry === 'vertical' || symmetry === 'both') {
        if (r >= genRows) {
          srcR = rows - 1 - r;
          if (srcR >= genRows) srcR = genRows - 1;
        }
      }

      if (srcR < genRows && srcC < genCols) {
        cells[rowColToIndex(r, c, columns)] = partial[rowColToIndex(srcR, srcC, genCols)];
      }
    }
  }

  return cells;
}

/**
 * Count pathway neighbors for a cell.
 */
function countPathwayNeighbors(cells, index, columns, rows, edgeWrapping) {
  const neighbors = getCardinalNeighbors(index, columns, rows, edgeWrapping);
  let count = 0;
  for (const n of neighbors) {
    if (cells[n] !== WALL) count++;
  }
  return count;
}

/**
 * Iteratively eliminate all dead ends by opening adjacent walls.
 */
function eliminateDeadEnds(cells, rows, columns, edgeWrapping, rng) {
  const size = rows * columns;
  let changed = true;
  let iterations = 0;
  const maxIterations = size; // safety limit

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let i = 0; i < size; i++) {
      if (cells[i] === WALL) continue;

      const neighbors = getCardinalNeighbors(i, columns, rows, edgeWrapping);
      let pathwayCount = 0;
      const wallNeighbors = [];

      for (const n of neighbors) {
        if (cells[n] !== WALL) {
          pathwayCount++;
        } else {
          wallNeighbors.push(n);
        }
      }

      // Dead end: only 1 pathway neighbor
      if (pathwayCount < 2 && wallNeighbors.length > 0) {
        // Try to open a wall that connects to another pathway
        let opened = false;
        // Shuffle wall neighbors for randomness
        for (let j = wallNeighbors.length - 1; j > 0; j--) {
          const k = Math.floor(rng() * (j + 1));
          [wallNeighbors[j], wallNeighbors[k]] = [wallNeighbors[k], wallNeighbors[j]];
        }

        for (const wallN of wallNeighbors) {
          // Check if the wall has a pathway on the other side
          const wallNeighborsOfWall = getCardinalNeighbors(wallN, columns, rows, edgeWrapping);
          let hasOtherPathway = false;
          for (const nn of wallNeighborsOfWall) {
            if (nn !== i && cells[nn] !== WALL) {
              hasOtherPathway = true;
              break;
            }
          }

          if (hasOtherPathway) {
            cells[wallN] = PATHWAY;
            opened = true;
            changed = true;
            break;
          }
        }

        // If no wall connects to another pathway, just open any wall
        if (!opened && wallNeighbors.length > 0) {
          cells[wallNeighbors[0]] = PATHWAY;
          changed = true;
        }
      }
    }
  }
}

/**
 * Apply edge wrapping by opening pathway connections at edges.
 * Returns a Set of cell indices that are edge-wrap tunnels (protected from repair).
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @param {string} edgeWrapping - 'horizontal', 'vertical', or 'both'
 * @param {Function} rng
 * @returns {Set<number>}
 */
function applyEdgeWrapping(cells, rows, columns, edgeWrapping, rng) {
  const wrappedCells = new Set();
  const wrapH = edgeWrapping === 'horizontal' || edgeWrapping === 'both';
  const wrapV = edgeWrapping === 'vertical' || edgeWrapping === 'both';
  let horizontalOpened = 0;
  let verticalOpened = 0;

  // Open horizontal wrap connections (left edge ↔ right edge)
  if (wrapH) {
    for (let r = 1; r < rows - 1; r++) {
      const leftIdx = rowColToIndex(r, 0, columns);
      const rightIdx = rowColToIndex(r, columns - 1, columns);
      const leftInner = rowColToIndex(r, 1, columns);
      const rightInner = rowColToIndex(r, columns - 2, columns);

      if (cells[leftInner] !== WALL && cells[rightInner] !== WALL) {
        if (rng() < 0.5) {
          cells[leftIdx] = PATHWAY;
          cells[rightIdx] = PATHWAY;
          wrappedCells.add(leftIdx);
          wrappedCells.add(rightIdx);
          horizontalOpened++;
        }
      }
    }

    // Guarantee at least one horizontal tunnel
    if (horizontalOpened === 0) {
      for (let r = 1; r < rows - 1; r++) {
        const leftInner = rowColToIndex(r, 1, columns);
        const rightInner = rowColToIndex(r, columns - 2, columns);
        if (cells[leftInner] !== WALL && cells[rightInner] !== WALL) {
          const leftIdx = rowColToIndex(r, 0, columns);
          const rightIdx = rowColToIndex(r, columns - 1, columns);
          cells[leftIdx] = PATHWAY;
          cells[rightIdx] = PATHWAY;
          wrappedCells.add(leftIdx);
          wrappedCells.add(rightIdx);
          break;
        }
      }
    }
  }

  // Open vertical wrap connections (top edge ↔ bottom edge)
  if (wrapV) {
    for (let c = 1; c < columns - 1; c++) {
      const topIdx = rowColToIndex(0, c, columns);
      const bottomIdx = rowColToIndex(rows - 1, c, columns);
      const topInner = rowColToIndex(1, c, columns);
      const bottomInner = rowColToIndex(rows - 2, c, columns);

      if (cells[topInner] !== WALL && cells[bottomInner] !== WALL) {
        if (rng() < 0.5) {
          cells[topIdx] = PATHWAY;
          cells[bottomIdx] = PATHWAY;
          wrappedCells.add(topIdx);
          wrappedCells.add(bottomIdx);
          verticalOpened++;
        }
      }
    }

    // Guarantee at least one vertical tunnel
    if (verticalOpened === 0) {
      for (let c = 1; c < columns - 1; c++) {
        const topInner = rowColToIndex(1, c, columns);
        const bottomInner = rowColToIndex(rows - 2, c, columns);
        if (cells[topInner] !== WALL && cells[bottomInner] !== WALL) {
          const topIdx = rowColToIndex(0, c, columns);
          const bottomIdx = rowColToIndex(rows - 1, c, columns);
          cells[topIdx] = PATHWAY;
          cells[bottomIdx] = PATHWAY;
          wrappedCells.add(topIdx);
          wrappedCells.add(bottomIdx);
          break;
        }
      }
    }
  }

  return wrappedCells;
}

/**
 * Repair 2x2 pathway rooms by converting one cell back to wall.
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @param {boolean} edgeWrapping
 * @param {Set} [protectedCells] - Cells that must not be converted to walls
 */
function repair2x2Rooms(cells, rows, columns, edgeWrapping, protectedCells) {
  const protected_ = protectedCells || new Set();
  let repaired = true;
  let iterations = 0;

  while (repaired && iterations < 100) {
    repaired = false;
    iterations++;

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < columns - 1; c++) {
        const tl = rowColToIndex(r, c, columns);
        const tr = rowColToIndex(r, c + 1, columns);
        const bl = rowColToIndex(r + 1, c, columns);
        const br = rowColToIndex(r + 1, c + 1, columns);

        if (cells[tl] !== WALL && cells[tr] !== WALL &&
            cells[bl] !== WALL && cells[br] !== WALL) {
          // Filter out protected cells from candidates
          const candidates = [tl, tr, bl, br].filter(idx => !protected_.has(idx));
          if (candidates.length === 0) continue;

          // Convert the cell with the most pathway neighbors to wall
          let bestIdx = -1;
          let bestCount = -1;

          for (const idx of candidates) {
            const count = countPathwayNeighbors(cells, idx, columns, rows, edgeWrapping);
            if (count > bestCount) {
              bestCount = count;
              bestIdx = idx;
            }
          }

          // Only convert if it won't create a dead end for its neighbors
          if (bestIdx >= 0 && bestCount >= 3) {
            cells[bestIdx] = WALL;
            repaired = true;
          }
        }
      }
    }
  }
}

/**
 * Generate a Pac-Man maze with validation and retry logic.
 * @param {number} rows
 * @param {number} columns
 * @param {{ symmetry?: string, edgeWrapping?: boolean }} config
 * @param {number} seed
 * @returns {{ cells: Uint8Array|null, seed: number, error?: string }}
 */
export function generatePacMan(rows, columns, config, seed) {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentSeed = seed + attempt;
    const rng = mulberry32(currentSeed);

    const cells = generatePacManMaze(rows, columns, config, rng);

    const validation = validatePacMan(cells, rows, columns, config);
    if (validation.valid) {
      return { cells, seed: currentSeed };
    }
  }

  return { cells: null, seed, error: 'Failed to generate valid Pac-Man maze after 10 attempts' };
}

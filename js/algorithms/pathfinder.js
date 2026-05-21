/**
 * Pathfinding and Connectivity Algorithms
 * BFS shortest path, flood fill, unreachable detection, cycle detection.
 * All functions use typed arrays for performance on 100×100 grids.
 */

import { getCardinalNeighbors } from './neighbors.js';

const WALL = 0;

/**
 * BFS shortest path from start to end.
 * @param {Uint8Array} cells - Grid cell states
 * @param {number} columns - Grid column count
 * @param {number} rows - Grid row count
 * @param {number} startIdx - Start cell index
 * @param {number} endIdx - End cell index
 * @param {boolean} edgeWrapping - Whether edges wrap
 * @returns {number[]|null} Array of cell indices forming the path, or null if no path
 */
export function findPath(cells, columns, rows, startIdx, endIdx, edgeWrapping) {
  const size = rows * columns;
  const visited = new Uint8Array(size);
  const parent = new Int32Array(size).fill(-1);

  visited[startIdx] = 1;
  const queue = [startIdx];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];

    if (current === endIdx) {
      return reconstructPath(parent, startIdx, endIdx);
    }

    const neighbors = getCardinalNeighbors(current, columns, rows, edgeWrapping);
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (!visited[neighbor] && cells[neighbor] !== WALL) {
        visited[neighbor] = 1;
        parent[neighbor] = current;
        queue.push(neighbor);
      }
    }
  }

  return null;
}

/**
 * Reconstruct path from parent array.
 */
function reconstructPath(parent, startIdx, endIdx) {
  const path = [];
  let current = endIdx;
  while (current !== startIdx) {
    path.push(current);
    current = parent[current];
    if (current === -1) return null; // safety check
  }
  path.push(startIdx);
  path.reverse();
  return path;
}

/**
 * Flood fill from a starting cell, finding all connected non-wall cells.
 * @param {Uint8Array} cells - Grid cell states
 * @param {number} columns - Grid column count
 * @param {number} rows - Grid row count
 * @param {number} startIdx - Starting cell index
 * @param {boolean} edgeWrapping - Whether edges wrap
 * @returns {{ connected: Uint8Array, count: number }}
 */
export function floodFill(cells, columns, rows, startIdx, edgeWrapping) {
  const size = rows * columns;
  const connected = new Uint8Array(size);
  let count = 0;

  if (cells[startIdx] === WALL) {
    return { connected, count: 0 };
  }

  const stack = [startIdx];
  connected[startIdx] = 1;
  count = 1;

  while (stack.length > 0) {
    const current = stack.pop();
    const neighbors = getCardinalNeighbors(current, columns, rows, edgeWrapping);

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (!connected[neighbor] && cells[neighbor] !== WALL) {
        connected[neighbor] = 1;
        count++;
        stack.push(neighbor);
      }
    }
  }

  return { connected, count };
}

/**
 * Find all unreachable pathway cells (not connected to the anchor cell).
 * @param {Uint8Array} cells - Grid cell states
 * @param {number} rows - Grid row count
 * @param {number} columns - Grid column count
 * @param {number} anchorIdx - Reference cell to measure connectivity from
 * @param {boolean} edgeWrapping - Whether edges wrap
 * @returns {Set<number>} Set of unreachable pathway cell indices
 */
export function findUnreachable(cells, rows, columns, anchorIdx, edgeWrapping) {
  const { connected } = floodFill(cells, columns, rows, anchorIdx, edgeWrapping);
  const unreachable = new Set();
  const size = rows * columns;

  for (let i = 0; i < size; i++) {
    if (cells[i] !== WALL && !connected[i]) {
      unreachable.add(i);
    }
  }

  return unreachable;
}

/**
 * Check if the pathway graph is cycle-free (spanning tree property).
 * A graph is cycle-free iff: edges = nodes - 1
 * where nodes = pathway cell count, edges = adjacent pathway cell pairs.
 * @param {Uint8Array} cells - Grid cell states
 * @param {number} rows - Grid row count
 * @param {number} columns - Grid column count
 * @param {boolean} edgeWrapping - Whether edges wrap
 * @returns {boolean} true if no cycles exist in the pathway graph
 */
export function isCycleFree(cells, rows, columns, edgeWrapping) {
  const size = rows * columns;
  let nodeCount = 0;
  let edgeCount = 0;

  for (let i = 0; i < size; i++) {
    if (cells[i] === WALL) continue;
    nodeCount++;

    // Count edges (only count each edge once by checking right and down neighbors)
    const row = Math.floor(i / columns);
    const col = i % columns;

    // Right neighbor
    if (col < columns - 1) {
      if (cells[i + 1] !== WALL) edgeCount++;
    } else if (edgeWrapping) {
      if (cells[row * columns] !== WALL) edgeCount++;
    }

    // Down neighbor
    if (row < rows - 1) {
      if (cells[i + columns] !== WALL) edgeCount++;
    } else if (edgeWrapping) {
      if (cells[col] !== WALL) edgeCount++;
    }
  }

  return edgeCount === nodeCount - 1;
}

/**
 * Count total pathway (non-wall) cells in the grid.
 * @param {Uint8Array} cells - Grid cell states
 * @returns {number}
 */
export function countPathwayCells(cells) {
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== WALL) count++;
  }
  return count;
}

/**
 * Find the index of a cell with a specific value.
 * @param {Uint8Array} cells - Grid cell states
 * @param {number} value - Cell value to find (e.g., 2 for Start, 3 for End)
 * @returns {number} Index of the cell, or -1 if not found
 */
export function findCellByValue(cells, value) {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === value) return i;
  }
  return -1;
}

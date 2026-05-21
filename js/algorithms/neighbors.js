/**
 * Cardinal Neighbors Utility
 * Provides wrapping-aware neighbor lookup and coordinate conversions.
 */

/**
 * Returns cardinal neighbor indices for a cell, with optional edge wrapping.
 * @param {number} index - Cell index in flat array
 * @param {number} columns - Grid column count
 * @param {number} rows - Grid row count
 * @param {boolean} edgeWrapping - Whether opposing edges are connected
 * @returns {number[]} Array of valid neighbor indices
 */
export function getCardinalNeighbors(index, columns, rows, edgeWrapping) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  const neighbors = [];

  // Up
  if (row > 0) {
    neighbors.push((row - 1) * columns + col);
  } else if (edgeWrapping) {
    neighbors.push((rows - 1) * columns + col);
  }

  // Down
  if (row < rows - 1) {
    neighbors.push((row + 1) * columns + col);
  } else if (edgeWrapping) {
    neighbors.push(col);
  }

  // Left
  if (col > 0) {
    neighbors.push(row * columns + (col - 1));
  } else if (edgeWrapping) {
    neighbors.push(row * columns + (columns - 1));
  }

  // Right
  if (col < columns - 1) {
    neighbors.push(row * columns + (col + 1));
  } else if (edgeWrapping) {
    neighbors.push(row * columns);
  }

  return neighbors;
}

/**
 * Converts a flat array index to (row, column) coordinates.
 * @param {number} index - Cell index in flat array
 * @param {number} columns - Grid column count
 * @returns {{ row: number, col: number }}
 */
export function indexToRowCol(index, columns) {
  return {
    row: Math.floor(index / columns),
    col: index % columns,
  };
}

/**
 * Converts (row, column) coordinates to a flat array index.
 * @param {number} row - Row index (0-based, top to bottom)
 * @param {number} col - Column index (0-based, left to right)
 * @param {number} columns - Grid column count
 * @returns {number} Cell index in flat array
 */
export function rowColToIndex(row, col, columns) {
  return row * columns + col;
}

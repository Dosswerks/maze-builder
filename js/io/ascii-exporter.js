/**
 * ASCII Exporter
 * Generates ASCII text representation of a maze with header metadata.
 */

const CHAR_MAP = { 0: '#', 1: ' ', 2: 'S', 3: 'E' };

/**
 * Generate the full ASCII export string including header.
 * @param {import('../state/store.js').StateStore['maze']} maze - Maze state
 * @returns {string} Complete ASCII export with header and maze data
 */
export function generateASCII(maze) {
  const header = [
    `// Type: ${maze.type}`,
    `// SubType: ${maze.subType || 'n/a'}`,
    `// Dimensions: ${maze.rows}x${maze.columns}`,
    `// Seed: ${maze.seed}`,
    `// Generated: ${maze.createdAt}`,
    `// Format: v1`,
  ].join('\n');

  let mazeData = '';
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.columns; c++) {
      const idx = r * maze.columns + c;
      mazeData += CHAR_MAP[maze.cells[idx]] || '#';
    }
    mazeData += '\n';
  }

  return header + '\n' + mazeData;
}

/**
 * Generate the suggested filename for export.
 * @param {object} maze - Maze state
 * @returns {string} Filename like "maze_classic_15x20.txt"
 */
export function getSuggestedFilename(maze) {
  return `maze_${maze.type}_${maze.rows}x${maze.columns}.txt`;
}

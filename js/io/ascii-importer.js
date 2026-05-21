/**
 * ASCII Importer
 * Parses ASCII maze files with validation and type detection.
 */

import { findPath, findCellByValue } from '../algorithms/pathfinder.js';

const VALID_CHARS = new Set(['#', ' ', 'S', 'E']);
const REVERSE_MAP = { '#': 0, ' ': 1, 'S': 2, 'E': 3 };

/**
 * Parse an ASCII maze file.
 * @param {string} content - Raw file content
 * @returns {import('../../types').ImportResult}
 */
export function parseASCII(content) {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const headers = {};
  const mazeLines = [];

  for (const line of lines) {
    if (line.startsWith('// ')) {
      const colonIdx = line.indexOf(': ', 3);
      if (colonIdx !== -1) {
        const key = line.slice(3, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 2).trim();
        headers[key] = value;
      }
    } else if (line.length > 0) {
      mazeLines.push(line);
    }
    // Empty lines (including trailing) are ignored
  }

  // Validate
  const errors = validateImport(mazeLines);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Detect type
  const detectedType = detectType(headers, mazeLines);

  // Parse cells
  const rows = mazeLines.length;
  const columns = mazeLines[0].length;
  const cells = new Uint8Array(rows * columns);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      cells[r * columns + c] = REVERSE_MAP[mazeLines[r][c]];
    }
  }

  // Additional validation for Classic mazes
  if (detectedType === 'classic') {
    const classicErrors = validateClassicImport(cells, rows, columns);
    if (classicErrors.length > 0) {
      return { success: false, errors: classicErrors };
    }
  }

  // Check solvability for classic mazes
  let unsolvable = false;
  if (detectedType === 'classic') {
    const startIdx = findCellByValue(cells, 2);
    const endIdx = findCellByValue(cells, 3);
    if (startIdx >= 0 && endIdx >= 0) {
      const path = findPath(cells, columns, rows, startIdx, endIdx, false);
      unsolvable = path === null;
    }
  }

  return {
    success: true,
    maze: {
      rows,
      columns,
      cells,
      type: detectedType,
      seed: headers.seed ? parseInt(headers.seed, 10) : null,
    },
    unsolvable,
    needsTypePrompt: detectedType === null,
  };
}

/**
 * Validate maze lines for structural issues.
 * @param {string[]} mazeLines
 * @returns {Array<{type: string, row?: number, column?: number, detail: string}>}
 */
function validateImport(mazeLines) {
  const errors = [];

  if (mazeLines.length === 0) {
    errors.push({ type: 'empty', detail: 'File contains no maze data.' });
    return errors;
  }

  const expectedLength = mazeLines[0].length;

  for (let r = 0; r < mazeLines.length; r++) {
    const line = mazeLines[r];

    // Check row length
    if (line.length !== expectedLength) {
      errors.push({
        type: 'uneven_row',
        row: r,
        detail: `Row ${r} has ${line.length} characters (expected ${expectedLength}).`,
      });
    }

    // Check for invalid characters
    for (let c = 0; c < line.length; c++) {
      if (!VALID_CHARS.has(line[c])) {
        errors.push({
          type: 'invalid_char',
          row: r,
          column: c,
          detail: `Invalid character '${line[c]}' at row ${r}, column ${c}.`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate Classic maze specific requirements (exactly one S and one E).
 * @param {Uint8Array} cells
 * @param {number} rows
 * @param {number} columns
 * @returns {Array<{type: string, detail: string}>}
 */
function validateClassicImport(cells, rows, columns) {
  const errors = [];
  let startCount = 0;
  let endCount = 0;

  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 2) startCount++;
    if (cells[i] === 3) endCount++;
  }

  if (startCount === 0) {
    errors.push({ type: 'missing_start', detail: 'Classic maze must have exactly one Start point (S). None found.' });
  } else if (startCount > 1) {
    errors.push({ type: 'multiple_start', detail: `Classic maze must have exactly one Start point (S). Found ${startCount}.` });
  }

  if (endCount === 0) {
    errors.push({ type: 'missing_end', detail: 'Classic maze must have exactly one End point (E). None found.' });
  } else if (endCount > 1) {
    errors.push({ type: 'multiple_end', detail: `Classic maze must have exactly one End point (E). Found ${endCount}.` });
  }

  return errors;
}

/**
 * Detect maze type from headers and content.
 * Precedence: (1) header, (2) S/E presence, (3) null (prompt user)
 * @param {object} headers
 * @param {string[]} mazeLines
 * @returns {string|null}
 */
function detectType(headers, mazeLines) {
  // Precedence 1: header
  if (headers.type) {
    const t = headers.type.toLowerCase();
    if (t === 'pacman' || t === 'classic') return t;
  }

  // Precedence 2: S/E presence
  const allChars = mazeLines.join('');
  const hasStart = allChars.includes('S');
  const hasEnd = allChars.includes('E');

  if (hasStart && hasEnd) return 'classic';
  if (!hasStart && !hasEnd) return 'pacman';

  // Ambiguous (has one but not the other)
  return null;
}

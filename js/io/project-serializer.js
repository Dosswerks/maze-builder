/**
 * Project Serializer
 * Handles JSON project file serialization and deserialization.
 */

const APP_VERSION = '1.0.0';
const FORMAT_VERSION = '1.0';
const MAX_SERIALIZED_HISTORY = 200;

/**
 * Serialize the current state to a Project_File JSON string.
 * @param {object} maze - MazeState
 * @param {{ undo: Array, redo: Array }} historyStack - From HistoryManager.getSerializableStack()
 * @returns {string} JSON string
 */
export function serializeProject(maze, historyStack) {
  const project = {
    formatVersion: FORMAT_VERSION,
    maze: {
      type: maze.type,
      subType: maze.subType,
      rows: maze.rows,
      columns: maze.columns,
      seed: maze.seed,
      cells: Array.from(maze.cells),
      metadata: Object.fromEntries(maze.metadata || new Map()),
      config: maze.config,
      createdAt: maze.createdAt,
      modifiedAt: new Date().toISOString(),
    },
    editor: {
      undoStack: historyStack.undo.slice(-MAX_SERIALIZED_HISTORY),
      redoStack: historyStack.redo.slice(-MAX_SERIALIZED_HISTORY),
    },
    appMetadata: {
      appVersion: APP_VERSION,
      savedAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(project, null, 2);
}

/**
 * Deserialize a Project_File JSON string.
 * @param {string} json - Raw JSON content
 * @returns {{ success: boolean, data?: object, warning?: string, error?: string }}
 */
export function deserializeProject(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return { success: false, error: `Invalid JSON: ${err.message}` };
  }

  // Validate structure
  if (!parsed.formatVersion) {
    return { success: false, error: 'Missing formatVersion field. Not a valid Maze Builder project file.' };
  }

  if (!parsed.maze || !parsed.maze.cells || !parsed.maze.type) {
    return { success: false, error: 'Missing required maze data fields.' };
  }

  // Version check
  let warning = null;
  if (parsed.formatVersion !== FORMAT_VERSION) {
    warning = `Project was saved with format version ${parsed.formatVersion} (current: ${FORMAT_VERSION}). Some features may not load correctly.`;
  }

  // Reconstruct maze state
  const maze = {
    type: parsed.maze.type,
    subType: parsed.maze.subType || null,
    rows: parsed.maze.rows,
    columns: parsed.maze.columns,
    seed: parsed.maze.seed,
    cells: new Uint8Array(parsed.maze.cells),
    metadata: new Map(Object.entries(parsed.maze.metadata || {})),
    config: parsed.maze.config || { density: 0.5, deadEndFrequency: 0.3, symmetry: 'none', edgeWrapping: false },
    createdAt: parsed.maze.createdAt || new Date().toISOString(),
    modifiedAt: parsed.maze.modifiedAt || new Date().toISOString(),
  };

  // Reconstruct history
  const editor = {
    undoStack: parsed.editor?.undoStack || [],
    redoStack: parsed.editor?.redoStack || [],
  };

  return { success: true, data: { maze, editor }, warning };
}

/**
 * Generate suggested filename for project save.
 * @param {object} maze
 * @returns {string}
 */
export function getProjectFilename(maze) {
  return `maze_project_${maze.type}_${maze.rows}x${maze.columns}.json`;
}

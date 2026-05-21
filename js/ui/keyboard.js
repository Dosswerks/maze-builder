/**
 * Keyboard Shortcut Handler
 * Platform-aware keyboard shortcuts for all primary actions.
 */

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

/**
 * Initialize keyboard shortcuts.
 * @param {object} controllers - { edit, generation, file, store, renderer }
 */
export function initKeyboard(controllers) {
  const { edit, file, store, renderer } = controllers;

  document.addEventListener('keydown', (e) => {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const mod = isMac ? e.metaKey : e.ctrlKey;

    // Undo: Cmd/Ctrl+Z
    if (mod && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      edit.undo();
      return;
    }

    // Redo: Cmd/Ctrl+Shift+Z or Ctrl+Y
    if (mod && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      edit.redo();
      return;
    }
    if (!isMac && e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      edit.redo();
      return;
    }

    // Save: Cmd/Ctrl+S
    if (mod && e.key === 's') {
      e.preventDefault();
      file.saveProject();
      return;
    }

    // Open: Cmd/Ctrl+O
    if (mod && e.key === 'o') {
      e.preventDefault();
      file.loadProject();
      return;
    }

    // Tool selection: 1-5
    if (!mod && !e.shiftKey && !e.altKey) {
      switch (e.key) {
        case '1': store.setEditorTool('pencil'); return;
        case '2': store.setEditorTool('eraser'); return;
        case '3': store.setEditorTool('rectangle'); return;
        case '4': store.setEditorTool('line'); return;
        case '5': store.setEditorTool('floodFill'); return;
      }
    }

    // Toggle paint mode: X
    if (e.key === 'x' || e.key === 'X') {
      if (!mod) {
        store.togglePaintMode();
        return;
      }
    }

    // Delete/Backspace: set focused cell to pathway
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!mod && renderer.focusCell && store.maze) {
        const { row, col } = renderer.focusCell;
        const idx = row * store.maze.columns + col;
        if (store.maze.cells[idx] !== 2 && store.maze.cells[idx] !== 3) {
          edit.handlePointerDown(row, col);
          edit.handlePointerUp(row, col);
        }
      }
      return;
    }

    // Zoom: +/= and -
    if (e.key === '+' || e.key === '=') {
      renderer.setZoom(store.view.zoom * 1.25);
      return;
    }
    if (e.key === '-') {
      renderer.setZoom(store.view.zoom / 1.25);
      return;
    }

    // Fit to screen: 0
    if (e.key === '0' && !mod) {
      renderer.fitToScreen();
      return;
    }

    // Arrow keys: pan or move focus cell
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      handleArrowKey(e.key, store, renderer);
      return;
    }

    // Enter/Space: toggle cell at focus
    if ((e.key === 'Enter' || e.key === ' ') && renderer.focusCell && store.maze) {
      e.preventDefault();
      const { row, col } = renderer.focusCell;
      edit.handlePointerDown(row, col);
      edit.handlePointerUp(row, col);
      return;
    }
  });
}

function handleArrowKey(key, store, renderer) {
  if (!store.maze) return;

  // If no focus cell, start at (0,0)
  if (!renderer.focusCell) {
    renderer.setFocusCell(0, 0);
    return;
  }

  let { row, col } = renderer.focusCell;

  switch (key) {
    case 'ArrowUp': row = Math.max(0, row - 1); break;
    case 'ArrowDown': row = Math.min(store.maze.rows - 1, row + 1); break;
    case 'ArrowLeft': col = Math.max(0, col - 1); break;
    case 'ArrowRight': col = Math.min(store.maze.columns - 1, col + 1); break;
  }

  renderer.setFocusCell(row, col);
  store.setCursorCell({ row, col });
}

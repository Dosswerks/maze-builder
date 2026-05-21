/**
 * Game Objects System
 * Allows placing game elements (collectibles, power-ups, spawns, etc.) on Pac-Man maze cells.
 */

const PATHWAY = 1;

/**
 * Object types that can be placed on pathway cells.
 * Each has a character for export and a render style.
 */
const GAME_OBJECTS = {
  'collectible': { char: '.', label: 'Collectible', color: '#ECC94B', shape: 'dot' },
  'powerup':     { char: 'B', label: 'Power-Up', color: '#9F7AEA', shape: 'diamond' },
  'player-spawn':{ char: 'K', label: 'Player Spawn', color: '#38A169', shape: 'triangle' },
  'enemy-spawn': { char: 'P', label: 'Enemy Spawn', color: '#E53E3E', shape: 'square' },
  'portal':      { char: '=', label: 'Portal', color: '#4299E1', shape: 'ring' },
  'gate':        { char: 'D', label: 'Gate', color: '#ED8936', shape: 'hline' },
  'pen':         { char: ' ', label: 'Pen Floor', color: '#4A5568', shape: 'fill' },
};

/**
 * Object placement state — stored separately from the cell grid.
 * Key: cell index, Value: object type string
 */
let gameObjects = new Map();
let activeObjectTool = null;

/**
 * Place or remove a game object at a cell index.
 */
function placeGameObject(idx, objType, store) {
  if (!store.maze) return;
  if (store.maze.cells[idx] !== PATHWAY && objType !== 'clear-obj') return;

  if (objType === 'clear-obj') {
    gameObjects.delete(idx);
  } else {
    gameObjects.set(idx, objType);
  }

  store.emit('objects-changed', { idx, objType });
}

/**
 * Render game objects on the canvas.
 */
function renderGameObjects(ctx, store) {
  const maze = store.maze;
  if (!maze || gameObjects.size === 0) return;

  const view = store.view;
  const cellSize = view.cellSize;
  const offsetX = view.panX;
  const offsetY = view.panY;

  ctx.save();
  for (const [idx, objType] of gameObjects) {
    const obj = GAME_OBJECTS[objType];
    if (!obj) continue;

    const row = Math.floor(idx / maze.columns);
    const col = idx % maze.columns;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const r = cellSize * 0.3;

    ctx.fillStyle = obj.color;
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 2;

    switch (obj.shape) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.lineTo(cx - r, cy + r);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4);
        break;
      case 'ring':
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'hline':
        ctx.fillRect(x + 2, cy - 2, cellSize - 4, 4);
        break;
      case 'fill':
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.globalAlpha = 1;
        break;
    }
  }
  ctx.restore();
}

/**
 * Initialize the game objects UI and event bindings.
 * Waits for the app module to set up the store, then hooks in.
 */
function initGameObjects() {
  // Bind object tool buttons
  document.querySelectorAll('.obj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const objType = btn.dataset.obj;
      document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
      if (activeObjectTool === objType) {
        activeObjectTool = null;
      } else {
        activeObjectTool = objType;
        btn.classList.add('active');
      }
    });
  });

  // Hook into the canvas for object placement via a custom event
  // The app controller will dispatch 'maze-canvas-click' events
  document.getElementById('maze-canvas').addEventListener('object-place', (e) => {
    if (!activeObjectTool) return;
    const { idx, store } = e.detail;
    placeGameObject(idx, activeObjectTool, store);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameObjects);
} else {
  initGameObjects();
}

// Export for use by app controller
export { gameObjects, activeObjectTool, placeGameObject, renderGameObjects, GAME_OBJECTS };

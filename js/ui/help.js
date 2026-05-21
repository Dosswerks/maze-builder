/**
 * Help System
 * Contextual help buttons that show modal explanations for each UI section.
 */

import { showModal, closeModal } from './modals.js';

const HELP_CONTENT = {
  'maze-type': `
    <h2 class="modal-title">Maze Type</h2>
    <div class="help-modal-body">
      <p>Choose the style of maze to generate.</p>
      <table>
        <tr><th>Option</th><th>Description</th></tr>
        <tr><td><strong>Pac-Man</strong></td><td>Open looping pathways with no dead ends. No start or end point. Every path connects back to another path, like an arcade game level.</td></tr>
        <tr><td><strong>Classic</strong></td><td>A maze with a start point (S) and end point (E). The goal is to navigate from S to E.</td></tr>
      </table>
      <p>When you select <strong>Classic</strong>, two sub-options appear:</p>
      <table>
        <tr><th>Sub-option</th><th>Description</th></tr>
        <tr><td><strong>Perfect</strong></td><td>Exactly one solution path exists. No loops, no shortcuts. Every dead end is a true dead end.</td></tr>
        <tr><td><strong>Imperfect</strong></td><td>Multiple solution paths may exist. Loops and alternate routes are allowed, creating a more open layout.</td></tr>
      </table>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'dimensions': `
    <h2 class="modal-title">Dimensions</h2>
    <div class="help-modal-body">
      <table>
        <tr><th>Field</th><th>Description</th></tr>
        <tr><td><strong>Rows</strong></td><td>Number of rows in the grid (5–100).</td></tr>
        <tr><td><strong>Cols</strong></td><td>Number of columns in the grid (5–100).</td></tr>
      </table>
      <p>Larger mazes take slightly longer to generate. For Pac-Man mazes, <strong>odd dimensions</strong> (15, 21, 31) tend to produce better results.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'seed': `
    <h2 class="modal-title">Seed</h2>
    <div class="help-modal-body">
      <table>
        <tr><th>Field</th><th>Description</th></tr>
        <tr><td><strong>Seed input</strong></td><td>Optional. Enter a number to reproduce a specific maze. Leave blank for a random maze each time.</td></tr>
        <tr><td><strong>Copy button</strong></td><td>Copies the current seed to your clipboard so you can share or save it.</td></tr>
      </table>
      <p>The same seed + same settings = the same maze every time. Useful for collaboration and version control.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'density': `
    <h2 class="modal-title">Density</h2>
    <div class="help-modal-body">
      <p>Controls how open or tight the maze feels.</p>
      <table>
        <tr><th>Value</th><th>Effect</th></tr>
        <tr><td><strong>Low (0.0)</strong></td><td>Long corridors, fewer branches. More claustrophobic.</td></tr>
        <tr><td><strong>High (1.0)</strong></td><td>More branching, shorter corridors. More open.</td></tr>
      </table>
      <p>For <strong>Imperfect</strong> mazes, higher density also removes more walls, creating more alternate paths.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'dead-ends': `
    <h2 class="modal-title">Dead Ends</h2>
    <div class="help-modal-body">
      <p>Controls how many dead ends remain in an imperfect maze.</p>
      <table>
        <tr><th>Value</th><th>Effect</th></tr>
        <tr><td><strong>0.0</strong></td><td>Almost no dead ends. Very open, many loops.</td></tr>
        <tr><td><strong>1.0</strong></td><td>Keeps all dead ends from the initial generation.</td></tr>
      </table>
      <p>Only available when Classic &rarr; Imperfect is selected.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'symmetry': `
    <h2 class="modal-title">Symmetry &amp; Edge Wrapping</h2>
    <div class="help-modal-body">
      <p><strong>Symmetry</strong> (Pac-Man only):</p>
      <table>
        <tr><th>Option</th><th>Description</th></tr>
        <tr><td><strong>None</strong></td><td>No symmetry. Fully random layout.</td></tr>
        <tr><td><strong>Horizontal</strong></td><td>Left half is mirrored to the right.</td></tr>
        <tr><td><strong>Vertical</strong></td><td>Top half is mirrored to the bottom.</td></tr>
        <tr><td><strong>Both</strong></td><td>Top-left quadrant is mirrored on both axes. Requires at least 7&times;7 grid.</td></tr>
      </table>
      <p><strong>Edge Wrapping:</strong></p>
      <table>
        <tr><th>Option</th><th>Description</th></tr>
        <tr><td><strong>None</strong></td><td>No wrapping. Edges are solid walls.</td></tr>
        <tr><td><strong>Horizontal</strong></td><td>Left edge connects to right edge &mdash; like side tunnels in Pac-Man.</td></tr>
        <tr><td><strong>Vertical</strong></td><td>Top edge connects to bottom edge.</td></tr>
        <tr><td><strong>Both</strong></td><td>All edges wrap. Left&harr;Right and Top&harr;Bottom.</td></tr>
      </table>
      <p>Tunnel openings are marked with blue arrows on the maze edges.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'file-operations': `
    <h2 class="modal-title">File Operations</h2>
    <div class="help-modal-body">
      <table>
        <tr><th>Button</th><th>Description</th></tr>
        <tr><td><strong>Save</strong></td><td>Saves the full project (maze + edit history) as a JSON file. You can reopen it later to continue editing.</td></tr>
        <tr><td><strong>Load</strong></td><td>Opens a previously saved project file.</td></tr>
        <tr><td><strong>Export</strong></td><td>Shows an ASCII text preview of the maze, then saves it as a .txt file. This is the developer-friendly output.</td></tr>
        <tr><td><strong>Import</strong></td><td>Opens an ASCII .txt maze file and loads it into the editor for modification.</td></tr>
      </table>
      <p><strong>Export format:</strong> # = wall, (space) = pathway, S = start, E = end. Header lines starting with // contain metadata.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'toolbar': `
    <h2 class="modal-title">Editing Tools</h2>
    <div class="help-modal-body">
      <table>
        <tr><th>Tool</th><th>Key</th><th>Description</th></tr>
        <tr><td>&#x270F;&#xFE0F; Pencil</td><td>1</td><td>Click to toggle a cell. Drag to paint multiple cells.</td></tr>
        <tr><td>&#x1F9F9; Eraser</td><td>2</td><td>Click or drag to convert cells to pathway.</td></tr>
        <tr><td>&#x25AD; Rectangle</td><td>3</td><td>Click and drag to fill a rectangular area.</td></tr>
        <tr><td>&#x2571; Line</td><td>4</td><td>Click start point, then click end point to draw a straight line.</td></tr>
        <tr><td>&#x1FAA3; Flood Fill</td><td>5</td><td>Click a cell to fill all connected cells of the same type.</td></tr>
      </table>
      <p><strong>Wall/Path toggle (X):</strong> Switches whether the pencil draws walls or pathways.</p>
      <p><strong>Undo/Redo:</strong> Cmd+Z / Cmd+Shift+Z (Mac) or Ctrl+Z / Ctrl+Shift+Z (Windows). Up to 1000 undo steps.</p>
      <p><strong>Checkboxes:</strong></p>
      <table>
        <tr><th>Option</th><th>Description</th></tr>
        <tr><td><strong>Path</strong></td><td>Highlights the shortest solution path from S to E (Classic only).</td></tr>
        <tr><td><strong>Unreachable</strong></td><td>Highlights pathway cells disconnected from the main maze.</td></tr>
        <tr><td><strong>Grid</strong></td><td>Shows/hides grid lines between cells.</td></tr>
      </table>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `,
  'objects': `
    <h2 class="modal-title">Place Objects</h2>
    <div class="help-modal-body">
      <p>Place game elements on pathway cells. These appear when a Pac-Man maze is generated. Click a tool, then click cells to place objects.</p>
      <table>
        <tr><th>Tool</th><th>Export Char</th><th>Description</th></tr>
        <tr><td>&#x25CF; Collectible</td><td>.</td><td>A pickup item placed on floor tiles. In export, pathways with no object default to this.</td></tr>
        <tr><td>&#x25C6; Power-Up</td><td>B</td><td>A special power-up item (e.g., bell, energizer).</td></tr>
        <tr><td>&#x1F6B6; Player Spawn</td><td>K</td><td>Where the player starts. Typically one per maze.</td></tr>
        <tr><td>&#x1F47B; Enemy Spawn</td><td>P</td><td>Where enemies spawn. Place inside a pen area.</td></tr>
        <tr><td>&#x1F300; Portal</td><td>=</td><td>A teleporter. Place in pairs on opposite edges for tunnels.</td></tr>
        <tr><td>&#x1F6AA; Gate</td><td>D</td><td>A one-way gate (e.g., pen entrance that enemies exit through).</td></tr>
        <tr><td>&#x2B1C; Pen Floor</td><td>(space)</td><td>Interior floor of an enemy pen/house area.</td></tr>
        <tr><td>&#x274C; Remove</td><td>&mdash;</td><td>Click to remove a placed object, reverting the cell to a plain pathway.</td></tr>
      </table>
      <p><strong>Export behavior:</strong> When you export a Pac-Man maze with objects placed, pathways without objects become <code>.</code> (collectible) by default. Objects export as their character shown above.</p>
    </div>
    <div class="modal-actions"><button class="primary-btn" id="modal-ok">Got it</button></div>
  `
};

// Bind help buttons on DOM ready
function initHelp() {
  document.querySelectorAll('.help-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.help;
      const content = HELP_CONTENT[key];
      if (content) {
        showModal(content, {});
        document.getElementById('modal-content').querySelector('#modal-ok').addEventListener('click', () => closeModal('ok'));
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHelp);
} else {
  initHelp();
}

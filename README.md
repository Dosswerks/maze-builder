# Maze Builder

A visual maze creation tool for generating workable mazes for video games. Open `maze-builder.html` directly in any browser — no server or installation required.

## Getting Started

1. Open `maze-builder.html` in Chrome, Firefox, Safari, or Edge
2. Select a maze type in the left panel
3. Click **Generate**
4. Edit the maze with the toolbar tools
5. Export when finished

---

## Left Panel — Configuration

### Maze Type

Choose the style of maze to generate.

| Option | Description |
|--------|-------------|
| **Pac-Man** | Open looping pathways with no dead ends. No start or end point. Every path connects back to another path, like an arcade game level. |
| **Classic** | A maze with a start point (S) and end point (E). The goal is to navigate from S to E. |

When you select **Classic**, two sub-options appear:

| Sub-option | Description |
|------------|-------------|
| **Perfect** | Exactly one solution path exists. No loops, no shortcuts. Every dead end is a true dead end. |
| **Imperfect** | Multiple solution paths may exist. Loops and alternate routes are allowed, creating a more open layout. |

### Dimensions

| Field | Description |
|-------|-------------|
| **Rows** | Number of rows in the grid (5–100). |
| **Cols** | Number of columns in the grid (5–100). |

Larger mazes take slightly longer to generate. For Pac-Man mazes, odd dimensions (15, 21, 31) tend to produce better results.

### Seed

| Field | Description |
|-------|-------------|
| **Seed input** | Optional. Enter a number to reproduce a specific maze. Leave blank for a random maze each time. |
| **Copy button** | Copies the current seed to your clipboard so you can share or save it. |

The same seed + same settings = the same maze every time.

### Density

Controls how open or tight the maze feels.

- **Low density (0.0):** Long corridors, fewer branches. More claustrophobic.
- **High density (1.0):** More branching, shorter corridors. More open.

For **Imperfect** mazes, higher density also removes more walls, creating more alternate paths.

### Dead Ends (Imperfect only)

Controls how many dead ends remain in an imperfect maze.

- **0.0:** Almost no dead ends. Very open, many loops.
- **1.0:** Keeps all dead ends from the initial generation.

Only visible when Classic → Imperfect is selected.

### Symmetry (Pac-Man only)

| Option | Description |
|--------|-------------|
| **None** | No symmetry applied. Fully random layout. |
| **Horizontal** | Left half is mirrored to the right. |
| **Vertical** | Top half is mirrored to the bottom. |
| **Both** | Top-left quadrant is mirrored on both axes. Requires at least 7×7 grid. |

### Edge Wrapping (Pac-Man only)

When checked, the left edge connects to the right edge and the top connects to the bottom — like the tunnels in the original Pac-Man. Paths can wrap around the edges of the grid.

### Generate / Regenerate

| Button | Description |
|--------|-------------|
| **Generate** | Creates a new maze using the current settings. |
| **Regenerate** | Creates a new maze with the same settings but a different random seed. If you have unsaved edits, it will ask for confirmation first. |

---

## Top Bar — File Operations

| Button | Description |
|--------|-------------|
| **Save** | Saves the full project (maze + edit history) as a JSON file. You can reopen it later to continue editing. |
| **Load** | Opens a previously saved project file. |
| **Export** | Shows an ASCII text preview of the maze, then saves it as a `.txt` file. This is the developer-friendly output. |
| **Import** | Opens an ASCII `.txt` maze file and loads it into the editor for modification. |

### Export Format

The exported file looks like this:

```
// Type: classic
// SubType: perfect
// Dimensions: 15x15
// Seed: 4281937562
// Generated: 2026-05-21T14:30:00
// Format: v1
###############
#S  # #   #   #
# # # # # # # #
# #   # #   # #
# ##### ##### #
#       #    E#
###############
```

- `#` = wall
- ` ` (space) = pathway
- `S` = start point
- `E` = end point
- Header lines (starting with `//`) contain metadata

---

## Toolbar — Editing Tools

### Drawing Tools

| Tool | Key | Description |
|------|-----|-------------|
| ✏️ Pencil | 1 | Click to toggle a cell. Drag to paint multiple cells. |
| 🧹 Eraser | 2 | Click or drag to convert cells to pathway (open space). |
| ▭ Rectangle | 3 | Click and drag to fill a rectangular area. |
| ╱ Line | 4 | Click start point, then click end point to draw a straight line. |
| 🪣 Flood Fill | 5 | Click a cell to fill all connected cells of the same type. |

### Paint Mode

| Button | Key | Description |
|--------|-----|-------------|
| **Wall / Path** | X | Toggles whether the pencil draws walls or pathways. The current mode is shown on the button. |

### Undo / Redo

| Button | Key | Description |
|--------|-----|-------------|
| **Undo** | Cmd+Z (Mac) / Ctrl+Z | Reverts the last edit. Supports up to 1000 undo steps. |
| **Redo** | Cmd+Shift+Z (Mac) / Ctrl+Shift+Z or Ctrl+Y | Re-applies an undone edit. |

### Visualization Toggles

| Checkbox | Description |
|----------|-------------|
| **Path** | Highlights the shortest solution path from S to E (Classic mazes only). |
| **Unreachable** | Highlights pathway cells that are disconnected from the main maze. |
| **Grid** | Shows/hides the grid lines between cells. |

---

## Canvas — The Maze View

The large center area displays your maze. Interactions:

| Action | How |
|--------|-----|
| **Edit cells** | Click or drag with the active tool |
| **Zoom in/out** | Mouse wheel, or `+` / `-` keys |
| **Fit to screen** | Press `0` |
| **Pan** | Hold Space + drag, or use arrow keys |
| **See coordinates** | Bottom-left corner shows (row, col) of the cell under your cursor |

### Minimap

For mazes larger than 30×30, a minimap appears in the bottom-right corner showing the full maze. Click anywhere on the minimap to jump to that area.

---

## Status Bar

The bottom bar shows:

- **Seed** — The random seed used to generate the current maze
- **Dimensions** — Current grid size (rows × columns)
- **Type** — Current maze type (Classic Perfect, Classic Imperfect, or Pac-Man)
- **⚠ No path found** — Warning that appears when editing breaks the solution path (Classic mazes only)

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Shift+Z or Ctrl+Y |
| Pencil | 1 | 1 |
| Eraser | 2 | 2 |
| Rectangle | 3 | 3 |
| Line | 4 | 4 |
| Flood Fill | 5 | 5 |
| Toggle Wall/Path | X | X |
| Zoom in | + or = | + or = |
| Zoom out | - | - |
| Fit to screen | 0 | 0 |
| Pan | Arrow keys | Arrow keys |
| Save | Cmd+S | Ctrl+S |
| Open | Cmd+O | Ctrl+O |
| Toggle cell (keyboard nav) | Enter or Space | Enter or Space |

---

## Tips

- **Pac-Man mazes work best with odd dimensions** (15×15, 21×21, 31×31) because the internal carving grid uses odd-indexed cells.
- **Use seeds for collaboration** — share a seed number and settings with a teammate to reproduce the exact same maze.
- **The Path overlay is your friend** — turn it on while editing Classic mazes to see if your changes break the solution.
- **Autosave is active** — if your browser crashes, you'll be prompted to recover your work on next load.
- **Export is for developers** — the ASCII format is easy to parse in any game engine. Each character maps to one grid cell.

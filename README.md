# Lines Game Algorithm Tester

A single-file web application for evaluating and benchmarking move algorithms for the classic **Lines** (Color Lines) puzzle game.

## Overview

This tool provides a deterministic, reproducible testing environment for Lines game AI algorithms. It runs multiple game simulations, computes statistics, and maintains a persistent leaderboard to help you develop and compare different strategies.

## Features

### Core Functionality
- **Complete Game Engine**: Full implementation of Lines game rules with no "next balls" preview
- **Deterministic Evaluation**: Seeded PRNG ensures reproducible results across runs
- **Safe Execution**: Algorithms run in sandboxed environment with per-move timeouts (20ms)
- **Batch Testing**: Run multiple games (default 50) to get statistically significant results

### User Interface
- **Persistent Leaderboard**: Top 20 results stored in localStorage with expandable code view
- **Real-time Progress**: Live progress bar and statistics during evaluation
- **Visual Board**: Canvas-based visualization showing the final game state
- **Configurable Parameters**: Adjust board size, colors, number of games, and RNG seed

### Statistics
- Average Score (with standard deviation)
- Best/Median/Worst scores
- Move acceptance/rejection counts
- Algorithm hash for identification

## Quick Start

1. **Download**: Save `index.html` to your computer
2. **Open**: Open the file in any modern web browser (Chrome, Firefox, Safari, Edge)
3. **Run**: Click "Start Evaluation" to test the default baseline algorithm
4. **Experiment**: Modify the algorithm code and re-run to compare results

No installation, no dependencies, no build steps required!

## Game Rules

### Objective
Clear balls from the board by forming lines of 5+ balls of the same color. Maximize your score before the board fills up.

### Mechanics
1. **Initial Setup**: 5 random balls spawn on an empty 9×9 board
2. **Your Turn**: Move one ball to any reachable empty cell (via 4-neighbor path)
3. **Line Clearing**: After moving, if 5+ same-color balls form a line (horizontal/vertical/diagonal), they disappear and you score points
4. **Spawning**: If no lines cleared, 3 new random balls spawn
5. **Secondary Clear**: After spawn, check again for lines and clear them
6. **Game Over**: No empty cells remain

### Scoring
Each cleared ball = 1 point. No cascading or combos beyond the two clear checks per turn.

## Algorithm Interface

Your algorithm receives a board state and must return a valid move:

```javascript
function makeMove(board) {
  // board = { width, height, colorsCount, cells }
  // cells[y][x] = -1 for empty, or 0..(colorsCount-1) for ball color

  // Return a move object:
  return {
    from: [x1, y1],  // source cell with a ball
    to: [x2, y2]     // reachable empty cell
  };

  // Return null if no move available
}
```

### Constraints
- Move must be from a non-empty cell to an empty cell
- Target must be reachable via a path of empty cells (4-neighbor BFS)
- Function must complete within 20ms per call
- No access to DOM or network (sandboxed execution)

## Example Algorithms

### Baseline (Provided)
Makes the first valid move found by iterating through all balls and empty cells.

```javascript
function makeMove(board) {
  const { width, height, cells } = board;

  function reachable(from, to) {
    // BFS implementation...
  }

  const balls = [], empties = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x] === -1) empties.push([x, y]);
      else balls.push([x, y]);
    }
  }

  for (const from of balls) {
    for (const to of empties) {
      if (reachable(from, to)) return { from, to };
    }
  }
  return null;
}
```

### Strategy Ideas
- **Greedy Line Former**: Prioritize moves that immediately create lines
- **Threat Avoider**: Prevent opponent colors from forming near-lines
- **Space Optimizer**: Keep the board open by clearing congested areas
- **Color Consolidation**: Group same colors together for future opportunities
- **Edge Preference**: Keep the center clear and work from edges

## Configuration Options

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Games | 50 | 1-1000 | Number of games to run per evaluation |
| Width | 9 | 3-20 | Board width in cells |
| Height | 9 | 3-20 | Board height in cells |
| Colors | 7 | 2-10 | Number of different ball colors |
| Seed | "fixed-seed" | any string | RNG seed for reproducibility |

## Leaderboard

Results are automatically saved to your browser's localStorage and ranked by:
1. **Average Score** (descending)
2. **Fewer Invalid/Timeout Moves** (ascending)
3. **Earlier Timestamp** (ascending)

Each entry includes:
- Performance statistics
- Configuration used
- Algorithm source code (expandable)
- 8-character hash for identification
- Timestamp

## Technical Details

### Implementation
- Pure JavaScript (ES6+)
- No external libraries or frameworks
- ~1,000 lines of code in a single file
- Canvas API for visualization
- localStorage API for persistence

### Determinism
- Mulberry32 PRNG implementation
- Seed format: `baseSeed-gameIndex` for per-game variation
- Same seed + configuration = identical game sequence

### Performance
- Maximum 10,000 turns per game (prevents infinite loops)
- 20ms timeout per move execution
- Async evaluation with UI updates every 5 games
- Efficient BFS and line detection algorithms

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- ES6 support
- Canvas API
- localStorage API

## Development

The entire application is in `index.html`. To modify:

1. Open `index.html` in a text editor
2. Edit the `<script>` section for game logic
3. Edit the `<style>` section for appearance
4. Reload in browser to test changes

Key sections:
- **Lines 414-440**: PRNG and utilities
- **Lines 456-550**: Game engine (BFS, line detection)
- **Lines 609-699**: Main game loop
- **Lines 901-970**: Canvas visualization
- **Lines 974-1021**: Event handlers

## Tips for Algorithm Development

1. **Start Simple**: Get the baseline working, then iterate
2. **Test Determinism**: Use a fixed seed to debug specific game states
3. **Watch Timeouts**: Check leaderboard for invalid/timeout counts
4. **Use Console**: Add `console.log()` for debugging (open browser DevTools)
5. **Visualize**: Click "Run 1 Game" to see the final board state
6. **Compare**: Run multiple evaluations with different algorithms

## Known Limitations

- No step-by-step game replay (only final board shown)
- No export/import of algorithms or leaderboard
- No networking/multiplayer features
- Limited to single-threaded execution
- 20ms timeout may be tight for complex strategies

## License

MIT License - feel free to use, modify, and distribute.

## Contributing

This is a single-file project. To contribute improvements:
1. Fork the repository
2. Make changes to `index.html`
3. Test in multiple browsers
4. Submit a pull request

## Acknowledgments

Inspired by the classic Lines (Color Lines) puzzle game originally created by Olga Demina, Eugene Alemzhin, and Igor Ivkin in 1992.

---

**Live Demo**: Open `index.html` in your browser
**Source Code**: Single file, ~1,000 lines, fully commented
**No Installation Required**: Just download and open!

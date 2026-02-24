function makeMove(board) {
  const { width, height, cells } = board;

  function findAllMoves() {
    const balls = [], empties = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y][x] === -1) empties.push([x, y]);
        else balls.push([x, y]);
      }
    }
    if (!balls.length || !empties.length) return [];

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const moves = [];
    
    for (const [bx, by] of balls) {
      const q = [[bx, by]];
      const seen = new Set([by * width + bx]);
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const k = ny * width + nx;
          if (cells[ny][nx] === -1 && !seen.has(k)) {
            seen.add(k);
            if (nx !== bx || ny !== by) {
              moves.push({ from: [bx, by], to: [nx, ny], color: cells[by][bx] });
            }
            q.push([nx, ny]);
          }
        }
      }
    }
    return moves;
  }

  const workCells = cells.map(row => [...row]);

  function simulateMove(from, to, color) {
    const [fx, fy] = from, [tx, ty] = to;
    workCells[ty][tx] = color;
    workCells[fy][fx] = -1;

    const toClear = [];
    const dirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
    
    for (const [dx, dy] of dirs) {
      let len = 1;
      let nx = tx + dx, ny = ty + dy;
      while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
        len++; nx += dx; ny += dy;
      }
      if (len >= 5) {
        nx = tx; ny = ty;
        for (let i = 0; i < len; i++) {
          toClear.push(ny * width + nx);
          nx += dx; ny += dy;
        }
      }
    }

    const clearedSet = new Set(toClear);
    for (const idx of clearedSet) {
      const cx = idx % width, cy = Math.floor(idx / width);
      workCells[cy][cx] = -1;
    }

    return { cleared: clearedSet.size, cells: workCells.map(row => [...row]) };
  }

  function rollback(savedCells) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        workCells[y][x] = savedCells[y][x];
      }
    }
  }

  function evaluateMove(from, to, color) {
    const [fx, fy] = from;
    const [tx, ty] = to;
    const savedCells = workCells.map(row => [...row]);
    const result = simulateMove(from, to, color);
    const cleared = result.cleared;

    if (cleared >= 5) {
      rollback(savedCells);
      return { score: 10000 + cleared * 100, cleared };
    }

    let score = 0;
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    let maxLen = 0;
    
    for (const [dx, dy] of dirs) {
      let len = 1;
      let nx = tx + dx, ny = ty + dy;
      while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
        len++; nx += dx; ny += dy;
      }
      nx = tx - dx; ny = ty - dy;
      while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
        len++; nx -= dx; ny -= dy;
      }
      if (len > maxLen) maxLen = len;
      if (len >= 3) score += Math.pow(len - 1, 2) * 20;
    }

    if (maxLen >= 4) score += 800;
    if (maxLen === 3) score += 150;

    rollback(savedCells);
    return { score, cleared: 0 };
  }

  const moves = findAllMoves();
  if (!moves.length) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const result = evaluateMove(move.from, move.to, move.color);
    const score = result.score;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { from: bestMove.from, to: bestMove.to };
}

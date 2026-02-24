function makeMove(board) {
  const { width, height, cells } = board;

  function getBallsByColor() {
    const counts = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = cells[y][x];
        if (c !== -1) counts[c] = (counts[c] || 0) + 1;
      }
    }
    return counts;
  }

  function countLineInDir(x, y, dx, dy, color) {
    let count = 1;
    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
      count++; nx += dx; ny += dy;
    }
    nx = x - dx; ny = y - dy;
    while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
      count++; nx -= dx; ny -= dy;
    }
    return count;
  }

  function findAllMoves() {
    const balls = [], empties = [];
    const ballSet = new Set();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y][x] === -1) empties.push([x, y]);
        else {
          balls.push([x, y]);
          ballSet.add(y * width + x);
        }
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

  function countPotential(color) {
    let potential = 0;
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (workCells[y][x] !== color) continue;
        for (const [dx, dy] of dirs) {
          let len = 1;
          let nx = x + dx, ny = y + dy;
          while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
            len++; nx += dx; ny += dy;
          }
          nx = x - dx; ny = y - dy;
          while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
            len++; nx -= dx; ny -= dy;
          }
          if (len >= 3) potential += Math.pow(len - 1, 1.5) * 15;
        }
      }
    }
    return potential;
  }

  function simulateSpawnLookAhead(spawnCount = 3) {
    const spawnCells = workCells.map(row => [...row]);
    const empties = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (spawnCells[y][x] === -1) empties.push([x, y]);
      }
    }
    if (empties.length < spawnCount) return 0;
    
    let maxPotential = 0;
    for (let i = 0; i < Math.min(spawnCount, empties.length); i++) {
      const idx = i;
      const [ex, ey] = empties[idx];
      const color = Math.floor(Math.random() * 7);
      spawnCells[ey][ex] = color;
      
      const tempWork = spawnCells;
      let potential = 0;
      const dirs = [[1,0], [0,1], [1,1], [1,-1]];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (tempWork[y][x] === -1) continue;
          const c = tempWork[y][x];
          for (const [dx, dy] of dirs) {
            let len = 1;
            let nx = x + dx, ny = y + dy;
            while (nx >= 0 && nx < width && ny >= 0 && ny < height && tempWork[ny][nx] === c) {
              len++; nx += dx; ny += dy;
            }
            nx = x - dx; ny = y - dy;
            while (nx >= 0 && nx < width && ny >= 0 && ny < height && tempWork[ny][nx] === c) {
              len++; nx -= dx; ny -= dy;
            }
            if (len >= 5) potential += 1000;
            else if (len >= 4) potential += 200;
            else if (len >= 3) potential += 50;
          }
        }
      }
      if (potential > maxPotential) maxPotential = potential;
    }
    return maxPotential;
  }

  function evaluateMove(from, to, color, colorCount) {
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
      const len = countLineInDir(tx, ty, dx, dy, color);
      if (len >= 2) {
        score += Math.pow(len - 1, 2.5) * 50;
        if (len > maxLen) maxLen = len;
      }
    }

    if (maxLen >= 4) score += 800;
    if (maxLen === 3) score += 150;

    for (const [dx, dy] of dirs) {
      let len = 1;
      let nx = tx + dx, ny = ty + dy;
      let openEnd1 = false;
      while (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (workCells[ny][nx] === -1) { openEnd1 = true; break; }
        if (workCells[ny][nx] !== color) break;
        len++; nx += dx; ny += dy;
      }
      nx = tx - dx; ny = ty - dy;
      let openEnd2 = false;
      while (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (workCells[ny][nx] === -1) { openEnd2 = true; break; }
        if (workCells[ny][nx] !== color) break;
        len++; nx -= dx; ny -= dy;
      }
      if (len >= 4) score += (len - 3) * 60;
      if (len >= 3 && openEnd1 && openEnd2) score += 100;
    }

    const cx = width / 2, cy = height / 2;
    const centerDistSq = (tx - cx) ** 2 + (ty - cy) ** 2;
    score += (16 - centerDistSq) * 2;

    const adjDirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
    let adjCount = 0;
    for (const [dx, dy] of adjDirs) {
      const nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
        adjCount++;
      }
    }
    score += adjCount * 15;

    let mobility = 0;
    for (const [dx, dy] of adjDirs) {
      const nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === -1) {
        mobility++;
      }
    }
    score += mobility * 8;

    score += colorCount * 10;

    const boardPotential = countAllBoardPotential();
    score += boardPotential * 1.2;

    rollback(savedCells);
    return { score, cleared: 0 };
  }

  function countAllBoardPotential() {
    let potential = 0;
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    const checked = new Set();
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (workCells[y][x] === -1) continue;
        const color = workCells[y][x];
        for (const [dx, dy] of dirs) {
          let len = 1;
          let nx = x + dx, ny = y + dy;
          while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
            len++; nx += dx; ny += dy;
          }
          nx = x - dx; ny = y - dy;
          while (nx >= 0 && nx < width && ny >= 0 && ny < height && workCells[ny][nx] === color) {
            len++; nx -= dx; ny -= dy;
          }
          if (len >= 5) potential += 500;
          else if (len >= 4) potential += 150;
          else if (len >= 3) potential += 50;
        }
      }
    }
    return potential;
  }

  const moves = findAllMoves();
  if (!moves.length) return null;

  const counts = getBallsByColor();
  const colorCounts = {};
  for (const move of moves) {
    const c = move.color;
    if (colorCounts[c] === undefined) {
      colorCounts[c] = counts[c] || 0;
    }
  }

  const empties = cells.flat().filter(c => c === -1).length;
    const endGameBonus = empties < 15;
    const lateGameBonus = empties < 10;

    let bestMove = null;
    let bestScore = -Infinity;
    let bestCleared = 0;

    for (const move of moves) {
      const result = evaluateMove(move.from, move.to, move.color, colorCounts[move.color]);
      let score = result.score;
      if (endGameBonus && colorCounts[move.color] >= 4) score *= 1.5;
      if (lateGameBonus) score *= 2;
    if (score > bestScore || (score === bestScore && result.cleared > bestCleared)) {
      bestScore = score;
      bestCleared = result.cleared;
      bestMove = { from: move.from, to: move.to };
    }
  }

  return bestMove;
}

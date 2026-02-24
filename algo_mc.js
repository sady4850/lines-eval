function makeMove(board) {
  const { width, height, cells, colorsCount } = board;
  const SPAWN_PER_TURN = 3;

  function deepCopy(c) {
    return c.map(row => [...row]);
  }

  function findAllMoves() {
    const balls = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y][x] !== -1) {
          balls.push([x, y]);
        }
      }
    }
    if (!balls.length) return [];

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

  function findLinesToClear(boardCells) {
    const toClear = new Set();
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (boardCells[y][x] === -1) continue;
        const color = boardCells[y][x];
        
        for (const [dx, dy] of dirs) {
          if (x - dx < 0 || y - dy < 0 || y - dy >= height || x - dx < 0 || boardCells[y-dy][x-dx] === color) continue;
          
          let len = 1;
          let nx = x + dx, ny = y + dy;
          while (nx >= 0 && nx < width && ny >= 0 && ny < height && boardCells[ny][nx] === color) {
            len++; nx += dx; ny += dy;
          }
          
          if (len >= 5) {
            nx = x; ny = y;
            for (let i = 0; i < len; i++) {
              toClear.add(ny * width + nx);
              nx += dx; ny += dy;
            }
          }
        }
      }
    }
    return toClear;
  }

  function spawnBalls(boardCells) {
    const empties = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (boardCells[y][x] === -1) empties.push([x, y]);
      }
    }
    
    const actualCount = Math.min(SPAWN_PER_TURN, empties.length);
    for (let i = 0; i < actualCount; i++) {
      const idx = Math.floor(Math.random() * empties.length);
      const [x, y] = empties.splice(idx, 1)[0];
      boardCells[y][x] = Math.floor(Math.random() * colorsCount);
    }
  }

  function findMoves(boardCells) {
    const balls = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (boardCells[y][x] !== -1) {
          balls.push([x, y]);
        }
      }
    }
    if (!balls.length) return [];

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
          if (boardCells[ny][nx] === -1 && !seen.has(k)) {
            seen.add(k);
            if (nx !== bx || ny !== by) {
              moves.push({ from: [bx, by], to: [nx, ny], color: boardCells[by][bx] });
            }
            q.push([nx, ny]);
          }
        }
      }
    }
    return moves;
  }

  function simulateGame(boardCells, maxTurns) {
    let score = 0;
    
    for (let turn = 0; turn < maxTurns; turn++) {
      const moves = findMoves(boardCells);
      if (!moves.length) break;
      
      const move = moves[Math.floor(Math.random() * moves.length)];
      const [fx, fy] = move.from;
      const [tx, ty] = move.to;
      boardCells[ty][tx] = move.color;
      boardCells[fy][fx] = -1;
      
      const linesCleared = findLinesToClear(boardCells);
      if (linesCleared.size > 0) {
        for (const pos of linesCleared) {
          const y = Math.floor(pos / width);
          const x = pos % width;
          boardCells[y][x] = -1;
        }
        score += linesCleared.size;
      } else {
        spawnBalls(boardCells);
      }
    }
    return score;
  }

  const moves = findAllMoves();
  if (!moves.length) return null;

  function evaluateMove(from, to, color) {
    const [fx, fy] = from;
    const [tx, ty] = to;
    
    const tempCells = deepCopy(cells);
    tempCells[ty][tx] = color;
    tempCells[fy][fx] = -1;

    const toClear = findLinesToClear(tempCells);
    
    let score = 0;
    if (toClear.size >= 5) {
      score = 10000 + toClear.size * 100;
    } else {
      const dirs = [[1,0], [0,1], [1,1], [1,-1]];
      let maxLen = 0;
      
      for (const [dx, dy] of dirs) {
        let len = 1;
        let nx = tx + dx, ny = ty + dy;
        while (nx >= 0 && nx < width && ny >= 0 && ny < height && tempCells[ny][nx] === color) {
          len++; nx += dx; ny += dy;
        }
        nx = tx - dx; ny = ty - dy;
        while (nx >= 0 && nx < width && ny >= 0 && ny < height && tempCells[ny][nx] === color) {
          len++; nx -= dx; ny -= dy;
        }
        if (len > maxLen) maxLen = len;
        if (len >= 3) score += Math.pow(len - 1, 2) * 20;
      }

      if (maxLen >= 4) score += 800;
      if (maxLen === 3) score += 150;
    }

    return score;
  }

  const quickScores = [];
  for (let i = 0; i < moves.length; i++) {
    const score = evaluateMove(moves[i].from, moves[i].to, moves[i].color);
    quickScores.push({ idx: i, score });
  }

  quickScores.sort((a, b) => b.score - a.score);
  const topMoves = quickScores.slice(0, Math.min(5, quickScores.length));

  for (const item of topMoves) {
    const m = moves[item.idx];
    let mcScore = 0;
    const nSims = 5;
    
    for (let s = 0; s < nSims; s++) {
      const boardCopy = deepCopy(cells);
      const [fx, fy] = m.from;
      const [tx, ty] = m.to;
      boardCopy[ty][tx] = m.color;
      boardCopy[fy][fx] = -1;
      
      const linesCleared = findLinesToClear(boardCopy);
      if (linesCleared.size > 0) {
        for (const pos of linesCleared) {
          const y = Math.floor(pos / width);
          const x = pos % width;
          boardCopy[y][x] = -1;
        }
        mcScore += linesCleared.size;
      } else {
        spawnBalls(boardCopy);
      }
      
      mcScore += simulateGame(boardCopy, 8);
    }
    
    quickScores[item.idx].score += (mcScore / nSims) * 50;
  }

  quickScores.sort((a, b) => b.score - a.score);
  const best = quickScores[0];

  return { from: moves[best.idx].from, to: moves[best.idx].to };
}

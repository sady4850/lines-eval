function makeMove(board) {
  const { width, height, cells } = board;

  function reachable(from, to) {
    const [sx, sy] = from, [tx, ty] = to;
    if (sx === tx && sy === ty) return false;
    if (cells[ty][tx] !== -1) return false;
    const q = [[sx, sy]];
    const seen = new Set([sy * width + sx]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx === tx && ny === ty && cells[ny][nx] === -1) return true;
        if (nx>=0 && nx<width && ny>=0 && ny<height && cells[ny][nx] === -1) {
          const k = ny * width + nx;
          if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
        }
      }
    }
    return false;
  }

  const balls = [], empties = [];
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    if (cells[y][x] === -1) empties.push([x,y]); else balls.push([x,y]);
  }
  if (!balls.length || !empties.length) return null;

  for (const from of balls) {
    for (const to of empties) {
      if (reachable(from, to)) return { from, to };
    }
  }
  return null;
}

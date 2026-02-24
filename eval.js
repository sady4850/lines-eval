#!/usr/bin/env node

const INITIAL_SPAWN_COUNT = 5;
const SPAWN_PER_TURN = 3;
const LINE_LENGTH = 5;
const MAX_TURNS_PER_GAME = 10000;

function seededRandom(seedString) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(31, h) + seedString.charCodeAt(i) | 0;
  }
  let state = h;
  return function() {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function bfsReachableEmpty(cells, width, height, from, to) {
  const [sx, sy] = from;
  const [tx, ty] = to;
  if (sx === tx && sy === ty) return false;
  if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
  if (cells[ty][tx] !== -1) return false;
  if (cells[sy][sx] === -1) return false;

  const q = [[sx, sy]];
  const seen = new Set([sy * width + sx]);
  const dirs = [[1,0], [-1,0], [0,1], [0,-1]];

  while (q.length > 0) {
    const [x, y] = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx === tx && ny === ty) return true;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && cells[ny][nx] === -1) {
        const k = ny * width + nx;
        if (!seen.has(k)) {
          seen.add(k);
          q.push([nx, ny]);
        }
      }
    }
  }
  return false;
}

function findLinesToClear(cells, width, height, lineLength) {
  const toClear = new Set();

  function checkLine(x, y, dx, dy) {
    const color = cells[y][x];
    if (color === -1) return;

    const line = [[x, y]];
    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && nx < width && ny >= 0 && ny < height && cells[ny][nx] === color) {
      line.push([nx, ny]);
      nx += dx;
      ny += dy;
    }

    if (line.length >= lineLength) {
      for (const [lx, ly] of line) {
        toClear.add(ly * width + lx);
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x] !== -1 && (x === 0 || cells[y][x-1] !== cells[y][x])) {
        checkLine(x, y, 1, 0);
      }
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (cells[y][x] !== -1 && (y === 0 || cells[y-1][x] !== cells[y][x])) {
        checkLine(x, y, 0, 1);
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x] !== -1 && (x === 0 || y === 0 || cells[y-1][x-1] !== cells[y][x])) {
        checkLine(x, y, 1, 1);
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x] !== -1 && (x === width-1 || y === 0 || cells[y-1][x+1] !== cells[y][x])) {
        checkLine(x, y, -1, 1);
      }
    }
  }

  return toClear;
}

function spawnBalls(rng, cells, width, height, colorsCount, count) {
  const empties = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x] === -1) empties.push([x, y]);
    }
  }

  const spawned = [];
  const actualCount = Math.min(count, empties.length);

  for (let i = 0; i < actualCount; i++) {
    const idx = randomInt(rng, 0, empties.length - 1);
    const [x, y] = empties.splice(idx, 1)[0];
    const color = randomInt(rng, 0, colorsCount - 1);
    cells[y][x] = color;
    spawned.push([x, y]);
  }

  return spawned;
}

function deepCopyBoard(board) {
  return {
    width: board.width,
    height: board.height,
    colorsCount: board.colorsCount,
    cells: board.cells.map(row => [...row])
  };
}

function safeCallMakeMove(fn, board, timeLimitMs) {
  const startTime = Date.now();
  try {
    const result = fn(deepCopyBoard(board));
    const elapsed = Date.now() - startTime;
    if (elapsed > timeLimitMs) {
      return { success: false, error: 'timeout' };
    }
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function runGame(makeMoveFn, width, height, colorsCount, rng, perMoveTimeoutMs = 20) {
  const cells = Array(height).fill(null).map(() => Array(width).fill(-1));
  const board = { width, height, colorsCount, cells };

  let score = 0;
  let turns = 0;
  let movesAccepted = 0;
  let movesInvalidOrTimeout = 0;

  spawnBalls(rng, cells, width, height, colorsCount, INITIAL_SPAWN_COUNT);

  while (turns < MAX_TURNS_PER_GAME) {
    turns++;

    const hasEmpty = cells.some(row => row.includes(-1));
    if (!hasEmpty) break;

    const callResult = safeCallMakeMove(makeMoveFn, board, perMoveTimeoutMs);
    let moveMade = false;

    if (callResult.success && callResult.result) {
      const move = callResult.result;

      if (move.from && move.to &&
          Array.isArray(move.from) && Array.isArray(move.to) &&
          move.from.length === 2 && move.to.length === 2) {

        const [fx, fy] = move.from;
        const [tx, ty] = move.to;

        if (fx >= 0 && fx < width && fy >= 0 && fy < height &&
            tx >= 0 && tx < width && ty >= 0 && ty < height &&
            cells[fy][fx] !== -1 && cells[ty][tx] === -1 &&
            bfsReachableEmpty(cells, width, height, [fx, fy], [tx, ty])) {

          cells[ty][tx] = cells[fy][fx];
          cells[fy][fx] = -1;
          moveMade = true;
          movesAccepted++;
        } else {
          movesInvalidOrTimeout++;
        }
      } else {
        movesInvalidOrTimeout++;
      }
    } else {
      movesInvalidOrTimeout++;
    }

    let linesCleared = findLinesToClear(cells, width, height, LINE_LENGTH);

    if (linesCleared.size > 0) {
      for (const pos of linesCleared) {
        const y = Math.floor(pos / width);
        const x = pos % width;
        cells[y][x] = -1;
      }
      score += linesCleared.size;
    } else if (moveMade || !callResult.success || !callResult.result) {
      spawnBalls(rng, cells, width, height, colorsCount, SPAWN_PER_TURN);

      linesCleared = findLinesToClear(cells, width, height, LINE_LENGTH);
      if (linesCleared.size > 0) {
        for (const pos of linesCleared) {
          const y = Math.floor(pos / width);
          const x = pos % width;
          cells[y][x] = -1;
        }
        score += linesCleared.size;
      }
    }
  }

  return { score, turns, movesAccepted, movesInvalidOrTimeout, finalBoard: cells };
}

function evaluate(algoSource, gamesCount, width, height, colorsCount, baseSeed, perMoveTimeoutMs = 20) {
  let makeMoveFn;
  try {
    const fnBody = algoSource + '\nreturn makeMove;';
    makeMoveFn = new Function(fnBody)();
    if (typeof makeMoveFn !== 'function') {
      throw new Error('makeMove is not a function');
    }
  } catch (e) {
    throw new Error('Failed to compile algorithm: ' + e.message);
  }

  const results = [];
  let totalMovesAccepted = 0;
  let totalMovesInvalid = 0;
  let lastBoard = null;

  for (let i = 0; i < gamesCount; i++) {
    const gameSeed = baseSeed + '-' + i;
    const rng = seededRandom(gameSeed);

    const result = runGame(makeMoveFn, width, height, colorsCount, rng, perMoveTimeoutMs);
    results.push(result.score);
    totalMovesAccepted += result.movesAccepted;
    totalMovesInvalid += result.movesInvalidOrTimeout;

    if (i === gamesCount - 1) {
      lastBoard = result.finalBoard;
    }

    if (gamesCount > 1 && i % 10 === 0) {
      process.stdout.write(`\rGame ${i + 1}/${gamesCount}`);
    }
  }

  if (gamesCount > 1) {
    process.stdout.write('\r' + ' '.repeat(20) + '\r');
  }

  results.sort((a, b) => a - b);
  const avgScore = results.reduce((a, b) => a + b, 0) / results.length;
  const median = results[Math.floor(results.length / 2)];
  const best = results[results.length - 1];
  const worst = results[0];

  const variance = results.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / results.length;
  const stdDev = Math.sqrt(variance);

  return {
    avgScore,
    stdDev,
    best,
    median,
    worst,
    games: gamesCount,
    width,
    height,
    colorsCount,
    movesAccepted: totalMovesAccepted,
    movesInvalidOrTimeout: totalMovesInvalid,
    seedUsed: baseSeed,
    lastBoard
  };
}

function printBoard(cells, width, height, colorsCount) {
  const colors = ' ABCDEFGHIJ';
  console.log('  ' + Array.from({length: width}, (_, i) => i).join(' '));
  console.log(' +' + '-'.repeat(width * 2 - 1) + '+');
  for (let y = 0; y < height; y++) {
    const row = cells[y].map(c => c === -1 ? '.' : colors[c % colors.length]).join(' ');
    console.log(`${y}| ${row}`);
  }
  console.log();
}

function main() {
  const args = process.argv.slice(2);
  
  let algoFile = null;
  let games = 50;
  let width = 9;
  let height = 9;
  let colors = 7;
  let seed = 'fixed-seed';
  let showBoard = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-f' && args[i + 1]) {
      algoFile = args[i + 1];
      i++;
    } else if (args[i] === '-n' && args[i + 1]) {
      games = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '-w') {
      width = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '-h') {
      height = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '-c') {
      colors = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '-s' && args[i + 1]) {
      seed = args[i + 1];
      if (seed === 'r') seed = 'seed-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      i++;
    } else if (args[i] === '--board') {
      showBoard = true;
    } else if (args[i] === '--help') {
      console.log(`Usage: node eval.js [options]
  
Options:
  -f <file>     Algorithm source file (required)
  -n <num>      Number of games (default: 50)
  -w <num>      Board width (default: 9)
  -h <num>      Board height (default: 9)
  -c <num>      Number of colors (default: 7)
  -s <seed>     Random seed (default: fixed-seed)
  --board       Show final board of last game
  --help        Show this help message`);
      process.exit(0);
    }
  }

  if (!algoFile) {
    console.error('Error: -f <file> is required');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  let algoSource;
  try {
    algoSource = require('fs').readFileSync(algoFile, 'utf8');
  } catch (e) {
    console.error('Error reading algorithm file:', e.message);
    process.exit(1);
  }

  console.log(`Running ${games} games (${width}x${height}, ${colors} colors, seed: ${seed})`);
  
  const result = evaluate(algoSource, games, width, height, colors, seed);

  console.log(`Avg Score: ${result.avgScore.toFixed(1)} ± ${result.stdDev.toFixed(1)}`);
  console.log(`Best/Median/Worst: ${result.best} / ${result.median} / ${result.worst}`);
  console.log(`Moves: ${result.movesAccepted} accepted, ${result.movesInvalidOrTimeout} invalid/timeout`);

  if (showBoard && result.lastBoard) {
    console.log('\nFinal board:');
    printBoard(result.lastBoard, width, height, colors);
  }
}

main();

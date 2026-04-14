// =====================================
// generate_levels.js
// Multipath generator with optional outer enclosing path
// =====================================

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function coordKey(row, col) {
  return `${row},${col}`;
}

function parseCoordKey(key) {
  const [row, col] = key.split(",").map(Number);
  return [row, col];
}

function manhattanDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function sameCell(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function isBorderCell(cell, size) {
  const [r, c] = cell;
  return r === 0 || c === 0 || r === size - 1 || c === size - 1;
}

function getGridNeighbors(row, col, size) {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]);
  if (row < size - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < size - 1) neighbors.push([row, col + 1]);
  return neighbors;
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

function countFreeCells(grid) {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === null) count++;
    }
  }
  return count;
}

function generateColorList(count) {
  const baseColors = [
    "red", "blue", "green", "yellow", "purple",
    "cyan", "orange", "pink", "lime", "teal"
  ];

  if (count > baseColors.length) {
    throw new Error(`Zu viele Farben: ${count}`);
  }

  return baseColors.slice(0, count);
}

function placePathOnGrid(grid, path, color) {
  for (const [row, col] of path) {
    grid[row][col] = color;
  }
}

function clearTempMarks(grid) {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid.length; col++) {
      if (grid[row][col] === "__TEMP__") {
        grid[row][col] = null;
      }
    }
  }
}

function getFreeComponents(grid, size) {
  const visited = new Set();
  const components = [];

  function floodFill(startRow, startCol) {
    const stack = [[startRow, startCol]];
    const component = [];

    while (stack.length > 0) {
      const [row, col] = stack.pop();
      const key = coordKey(row, col);

      if (visited.has(key)) continue;
      visited.add(key);

      if (grid[row][col] !== null) continue;

      component.push([row, col]);

      for (const [nr, nc] of getGridNeighbors(row, col, size)) {
        const nKey = coordKey(nr, nc);
        if (!visited.has(nKey) && grid[nr][nc] === null) {
          stack.push([nr, nc]);
        }
      }
    }

    return component;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = coordKey(row, col);
      if (grid[row][col] === null && !visited.has(key)) {
        const component = floodFill(row, col);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }
  }

  return components;
}

function canRemainingSpaceStillWork(grid, size, minLength = 2) {
  const components = getFreeComponents(grid, size);
  return components.every(component => component.length >= minLength);
}

function randomSegmentLengths(totalCells, nPairs, minLength = 3) {
  if (nPairs * minLength > totalCells) {
    throw new Error("Zu viele Farben oder minLength zu groß.");
  }

  const lengths = Array(nPairs).fill(minLength);
  let remaining = totalCells - nPairs * minLength;

  while (remaining > 0) {
    const candidates = [];

    for (let i = 0; i < nPairs; i++) {
      const weight = Math.max(1, Math.pow(lengths[i], 2.0));
      for (let w = 0; w < weight; w++) {
        candidates.push(i);
      }
    }

    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    lengths[idx]++;
    remaining--;
  }

  return shuffleArray(lengths);
}

function getRandomFreeCell(grid, size) {
  const freeCells = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === null) {
        freeCells.push([row, col]);
      }
    }
  }

  if (freeCells.length === 0) return null;
  return pickRandom(freeCells);
}

function getFreeNeighborsForPath(row, col, grid, size, visited) {
  const neighbors = [];

  for (const [nr, nc] of getGridNeighbors(row, col, size)) {
    const key = coordKey(nr, nc);

    if (grid[nr][nc] === null && !visited.has(key)) {
      neighbors.push([nr, nc]);
    }
  }

  return shuffleArray(neighbors);
}

function buildPathDFS(grid, size, row, col, remainingLength, visited, path, minRemainingComponentSize = 2) {
  const key = coordKey(row, col);

  visited.add(key);
  path.push([row, col]);
  grid[row][col] = "__TEMP__";

  if (!canRemainingSpaceStillWork(grid, size, minRemainingComponentSize)) {
    grid[row][col] = null;
    visited.delete(key);
    path.pop();
    return false;
  }

  if (remainingLength === 1) {
    return true;
  }

  let neighbors = getFreeNeighborsForPath(row, col, grid, size, visited);

  neighbors = neighbors.sort((a, b) => {
    const da = getFreeNeighborsForPath(a[0], a[1], grid, size, visited).length;
    const db = getFreeNeighborsForPath(b[0], b[1], grid, size, visited).length;
    return da - db;
  });

  for (const [nr, nc] of neighbors) {
    if (
      buildPathDFS(
        grid,
        size,
        nr,
        nc,
        remainingLength - 1,
        visited,
        path,
        minRemainingComponentSize
      )
    ) {
      return true;
    }
  }

  grid[row][col] = null;
  visited.delete(key);
  path.pop();
  return false;
}

function generateSinglePath(grid, size, length, maxAttempts = 100, minRemainingComponentSize = 2) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = getRandomFreeCell(grid, size);
    if (!start) return null;

    const [startRow, startCol] = start;
    const visited = new Set();
    const path = [];

    const success = buildPathDFS(
      grid,
      size,
      startRow,
      startCol,
      length,
      visited,
      path,
      minRemainingComponentSize
    );

    clearTempMarks(grid);

    if (success) return path;
  }

  return null;
}

// -------------------------------------
// Outer path helpers
// -------------------------------------
function getFreeBorderCells(grid, size, side = null) {
  const cells = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== null) continue;
      if (!isBorderCell([row, col], size)) continue;

      if (side === "left" && col !== 0) continue;
      if (side === "right" && col !== size - 1) continue;
      if (side === "top" && row !== 0) continue;
      if (side === "bottom" && row !== size - 1) continue;

      cells.push([row, col]);
    }
  }

  return cells;
}

function shortestPathOnFreeGrid(grid, size, start, end, reserved = new Set()) {
  const queue = [start];
  const visited = new Set([coordKey(start[0], start[1])]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();

    if (sameCell(current, end)) {
      const path = [];
      let currentKey = coordKey(current[0], current[1]);

      while (currentKey) {
        path.push(parseCoordKey(currentKey));
        currentKey = parent.get(currentKey);
      }

      path.reverse();
      return path;
    }

    let neighbors = getGridNeighbors(current[0], current[1], size);
    neighbors = shuffleArray(neighbors).sort((a, b) => {
      const da = manhattanDistance(a, end);
      const db = manhattanDistance(b, end);
      return da - db;
    });

    for (const next of neighbors) {
      const key = coordKey(next[0], next[1]);
      if (visited.has(key)) continue;
      if (reserved.has(key)) continue;

      const free = grid[next[0]][next[1]] === null;
      const isEnd = sameCell(next, end);

      if (!free && !isEnd) continue;

      visited.add(key);
      parent.set(key, coordKey(current[0], current[1]));
      queue.push(next);
    }
  }

  return null;
}

function stitchSegments(segments) {
  const full = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    for (let j = 0; j < seg.length; j++) {
      if (i > 0 && j === 0) continue;
      full.push(seg[j]);
    }
  }
  return full;
}

function hasRepeatedCells(path) {
  const seen = new Set();
  for (const [r, c] of path) {
    const key = coordKey(r, c);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function countBorderUsage(path, size) {
  let count = 0;
  for (const cell of path) {
    if (isBorderCell(cell, size)) count++;
  }
  return count;
}

function buildOuterPath(grid, size) {
  if (size < 6) return null;

  const leftCandidates = getFreeBorderCells(grid, size, "left").filter(([r]) => r >= 1 && r <= size - 2);
  const rightCandidates = getFreeBorderCells(grid, size, "right").filter(([r]) => r >= 1 && r <= size - 2);

  if (leftCandidates.length === 0 || rightCandidates.length === 0) return null;

  const start = pickRandom(leftCandidates);
  const end = pickRandom(rightCandidates);

  const mid = Math.floor(size / 2);

  const waypointSets = [
    [[0, size - 2], [mid - 1, mid], [size - 2, size - 1]],
    [[size - 1, size - 2], [mid + 1, mid], [1, size - 1]],
    [[1, 1], [mid, mid - 1], [size - 2, size - 2]],
    [[size - 2, 1], [mid, mid + 1], [1, size - 2]]
  ];

  for (const rawWaypoints of shuffleArray(waypointSets)) {
    const waypoints = rawWaypoints.filter(([r, c]) => {
      return r >= 0 && r < size && c >= 0 && c < size;
    });

    const workGrid = cloneGrid(grid);
    const reserved = new Set();
    const segments = [];
    let current = start;
    let ok = true;

    for (const target of [...waypoints, end]) {
      const segment = shortestPathOnFreeGrid(workGrid, size, current, target, reserved);
      if (!segment || segment.length < 2) {
        ok = false;
        break;
      }

      segments.push(segment);

      for (let i = 0; i < segment.length - 1; i++) {
        const [r, c] = segment[i];
        workGrid[r][c] = "__USED__";
        reserved.add(coordKey(r, c));
      }

      current = target;
    }

    if (!ok) continue;

    const fullPath = stitchSegments(segments);

    if (hasRepeatedCells(fullPath)) continue;

    const borderUsage = countBorderUsage(fullPath, size);
    if (borderUsage < Math.floor(fullPath.length * 0.35)) continue;

    const dist = manhattanDistance(fullPath[0], fullPath[fullPath.length - 1]);
    if (dist < Math.floor(size / 2)) continue;

    return fullPath;
  }

  return null;
}

// -------------------------------------
// Scoring helpers
// -------------------------------------
function getDirectionBetweenCells(a, b) {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];

  if (dr === -1 && dc === 0) return "up";
  if (dr === 1 && dc === 0) return "down";
  if (dr === 0 && dc === -1) return "left";
  if (dr === 0 && dc === 1) return "right";

  return null;
}

function countPathTurns(path) {
  let turns = 0;

  for (let i = 1; i < path.length - 1; i++) {
    const d1 = getDirectionBetweenCells(path[i - 1], path[i]);
    const d2 = getDirectionBetweenCells(path[i], path[i + 1]);
    if (d1 && d2 && d1 !== d2) turns++;
  }

  return turns;
}

function countTinyZigzags(path) {
  let zigzags = 0;

  for (let i = 0; i < path.length - 3; i++) {
    const d1 = getDirectionBetweenCells(path[i], path[i + 1]);
    const d2 = getDirectionBetweenCells(path[i + 1], path[i + 2]);
    const d3 = getDirectionBetweenCells(path[i + 2], path[i + 3]);

    if (!d1 || !d2 || !d3) continue;

    const opposite =
      (d1 === "left" && d3 === "right") ||
      (d1 === "right" && d3 === "left") ||
      (d1 === "up" && d3 === "down") ||
      (d1 === "down" && d3 === "up");

    if (opposite && d1 !== d2 && d2 !== d3) {
      zigzags++;
    }
  }

  return zigzags;
}

function countEndpointCrowding(level) {
  let crowding = 0;

  for (let i = 0; i < level.pairs.length; i++) {
    for (let j = i + 1; j < level.pairs.length; j++) {
      const a1 = level.pairs[i].start;
      const a2 = level.pairs[i].end;
      const b1 = level.pairs[j].start;
      const b2 = level.pairs[j].end;

      const distances = [
        manhattanDistance(a1, b1),
        manhattanDistance(a1, b2),
        manhattanDistance(a2, b1),
        manhattanDistance(a2, b2)
      ];

      const minDist = Math.min(...distances);

      if (minDist <= 1) crowding += 4;
      else if (minDist === 2) crowding += 2;
      else if (minDist === 3) crowding += 1;
    }
  }

  return crowding;
}

function countPathAdjacencies(level) {
  let score = 0;

  for (let i = 0; i < level.pairs.length; i++) {
    const pathA = level.pairs[i].fullPath;
    const setA = new Set(pathA.map(([r, c]) => coordKey(r, c)));

    for (let j = i + 1; j < level.pairs.length; j++) {
      const pathB = level.pairs[j].fullPath;
      const setB = new Set(pathB.map(([r, c]) => coordKey(r, c)));

      for (const [r, c] of pathA) {
        for (const [nr, nc] of getGridNeighbors(r, c, level.size)) {
          const key = coordKey(nr, nc);
          if (setB.has(key) && !setA.has(key)) {
            score++;
          }
        }
      }
    }
  }

  return score;
}

function countOuterLikePaths(level) {
  let count = 0;
  for (const pair of level.pairs) {
    const borderUsage = countBorderUsage(pair.fullPath, level.size);
    if (borderUsage >= Math.floor(pair.fullPath.length * 0.4) && pair.fullPath.length >= level.size + 2) {
      count++;
    }
  }
  return count;
}

function averagePathLength(level) {
  const lengths = level.pairs.map(pair => pair.fullPath.length);
  return lengths.reduce((a, b) => a + b, 0) / lengths.length;
}

function pathLengthVariance(level) {
  const lengths = level.pairs.map(pair => pair.fullPath.length);
  const avg = averagePathLength(level);

  let variance = 0;
  for (const len of lengths) {
    variance += (len - avg) * (len - avg);
  }

  return variance / lengths.length;
}

function evaluateLevelDifficulty(level) {
  let score = 0;
  let totalTurns = 0;
  let totalZigzags = 0;

  for (const pair of level.pairs) {
    const dist = manhattanDistance(pair.start, pair.end);
    const length = pair.fullPath.length;
    const turns = countPathTurns(pair.fullPath);
    const zigzags = countTinyZigzags(pair.fullPath);
    const borderUsage = countBorderUsage(pair.fullPath, level.size);

    totalTurns += turns;
    totalZigzags += zigzags;

    score += dist * 6;
    score += Math.min(turns * 1.5, length / 2);
    score += Math.min(borderUsage, Math.floor(length * 0.5));

    if (dist <= 1) score -= 60;
    else if (dist === 2) score -= 25;

    if (length <= 3) score -= 20;
    if (zigzags > 0) score -= zigzags * 14;
  }

  score += countEndpointCrowding(level) * 3;
  score += countPathAdjacencies(level) * 2.5;
  score += Math.min(pathLengthVariance(level), 80);
  score += countOuterLikePaths(level) * 35;
  score += Math.min(totalTurns, level.size * 3);
  score -= totalZigzags * 8;

  return score;
}

function isTooTrivial(level, minEndpointDistance = 2) {
  return level.pairs.some(pair => {
    const dist = manhattanDistance(pair.start, pair.end);
    return dist < minEndpointDistance;
  });
}

function stripFullPaths(level) {
  return {
    size: level.size,
    pairs: level.pairs.map(({ color, start, end }) => ({
      color,
      start,
      end
    }))
  };
}

// -------------------------------------
// Main multipath generator
// -------------------------------------
function generateMultipathLevel(config) {
  const {
    size,
    nPairs,
    minLength,
    pathAttempts,
    useOuterPath,
    outerPathChance,
    trivialMinDistance
  } = config;

  const colors = generateColorList(nPairs);

  for (let attempt = 0; attempt < (config.generatorAttempts || 80); attempt++) {
    const grid = createEmptyGrid(size);
    const pairs = [];
    let remainingColors = [...colors];

    // optional outer path
    if (useOuterPath && Math.random() < outerPathChance) {
      const outerColor = remainingColors.shift();
      const outerPath = buildOuterPath(grid, size);

      if (outerPath) {
        placePathOnGrid(grid, outerPath, outerColor);
        pairs.push({
          color: outerColor,
          start: outerPath[0],
          end: outerPath[outerPath.length - 1],
          fullPath: outerPath
        });
      }
    }

    const remainingPairCount = nPairs - pairs.length;
    if (remainingPairCount < 0) continue;

    const remainingCells = countFreeCells(grid);
    if (remainingPairCount * minLength > remainingCells) continue;

    const lengths = randomSegmentLengths(remainingCells, remainingPairCount, minLength);

    const colorLengthPairs = remainingColors
      .map((color, i) => ({
        color,
        length: lengths[i]
      }))
      .sort((a, b) => b.length - a.length);

    let success = true;

    for (const entry of colorLengthPairs) {
      const path = generateSinglePath(grid, size, entry.length, pathAttempts, 1);

      if (!path) {
        success = false;
        break;
      }

      placePathOnGrid(grid, path, entry.color);

      pairs.push({
        color: entry.color,
        start: path[0],
        end: path[path.length - 1],
        fullPath: path
      });
    }

    if (!success) continue;
    if (countFreeCells(grid) !== 0) continue;

    const level = { size, pairs };

    if (isTooTrivial(level, trivialMinDistance)) continue;

    const tooManyShortBorderPairs = level.pairs.filter(pair => {
      return (
        isBorderCell(pair.start, size) &&
        isBorderCell(pair.end, size) &&
        manhattanDistance(pair.start, pair.end) <= 3
      );
    }).length;

    if (tooManyShortBorderPairs >= Math.ceil(nPairs / 2)) continue;

    return level;
  }

  return null;
}

function buildWorld(name, config, count) {
  const levels = [];
  let tries = 0;
  const maxTotalTries = count * (config.worldAttempts || 12);

  while (levels.length < count && tries < maxTotalTries) {
    tries++;

    let bestLevel = null;
    let bestScore = -Infinity;

    for (let i = 0; i < (config.selectionAttempts || 12); i++) {
      const candidate = generateMultipathLevel(config);
      if (!candidate) continue;

      const score = evaluateLevelDifficulty(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestLevel = candidate;
      }
    }

    if (!bestLevel) {
      console.error(`Überspringe ${name}, kein Level gefunden (Versuch ${tries})`);
      continue;
    }

    levels.push({
      id: `${name}-${String(levels.length + 1).padStart(3, "0")}`,
      ...stripFullPaths(bestLevel)
    });

    console.error(`Generated ${name} level ${levels.length}/${count} score=${Math.round(bestScore)}`);
  }

  if (levels.length === 0) {
    throw new Error(`Für ${name} konnte gar kein Level erzeugt werden.`);
  }

  return levels;
}

// -------------------------------------
// Config
// -------------------------------------
const configs = {
  easy: {
    size: 6,
    nPairs: 5,
    minLength: 3,
    pathAttempts: 80,
    generatorAttempts: 40,
    selectionAttempts: 8,
    worldAttempts: 10,
    useOuterPath: false,
    outerPathChance: 0,
    trivialMinDistance: 2
  },

  medium: {
    size: 7,
    nPairs: 6,
    minLength: 3,
    pathAttempts: 100,
    generatorAttempts: 60,
    selectionAttempts: 10,
    worldAttempts: 12,
    useOuterPath: true,
    outerPathChance: 0.35,
    trivialMinDistance: 2
  },

  hard: {
    size: 8,
    nPairs: 7,
    minLength: 4,
    pathAttempts: 120,
    generatorAttempts: 80,
    selectionAttempts: 14,
    worldAttempts: 14,
    useOuterPath: true,
    outerPathChance: 0.75,
    trivialMinDistance: 3
  }
};

const easyLevels = buildWorld("easy", configs.easy, 5);
const mediumLevels = buildWorld("medium", configs.medium, 5);
const hardLevels = buildWorld("hard", configs.hard, 5);

const generatedEasyLevels = [
  ...easyLevels,
  ...mediumLevels,
  ...hardLevels
];

console.log(
  "const generatedEasyLevels = " +
    JSON.stringify(generatedEasyLevels, null, 2) +
    ";"
);
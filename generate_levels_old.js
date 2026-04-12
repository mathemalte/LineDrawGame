// =====================================
// generate_levels.js
// hard-only constructive bottleneck generator
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

function sameCell(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function manhattanDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function areNeighbors(a, b) {
  return manhattanDistance(a, b) === 1;
}

function isBorderCell(cell, size) {
  const [r, c] = cell;
  return r === 0 || c === 0 || r === size - 1 || c === size - 1;
}

function getDirectionBetweenCells(a, b) {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];

  if (dr === -1 && dc === 0) return "up";
  if (dr === 1 && dc === 0) return "down";
  if (dr === 0 && dc === -1) return "left";
  if (dr === 0 && dc === 1) return "right";

  return null;
}

function getGridNeighbors(row, col, size) {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]);
  if (row < size - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < size - 1) neighbors.push([row, col + 1]);
  return neighbors;
}

function createEmptyGrid(size, fillValue = null) {
  return Array.from({ length: size }, () => Array(size).fill(fillValue));
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
        if (component.length > 0) components.push(component);
      }
    }
  }

  return components;
}

function canRemainingSpaceStillWork(grid, size, minLength = 2) {
  const components = getFreeComponents(grid, size);
  return components.every(component => component.length >= minLength);
}

function randomSegmentLengths(totalCells, nPairs, minLength = 3, maxLength = null) {
  if (nPairs * minLength > totalCells) {
    throw new Error("Zu viele Farben oder minLength zu groß.");
  }

  const lengths = Array(nPairs).fill(minLength);
  let remaining = totalCells - nPairs * minLength;

  while (remaining > 0) {
    const candidates = [];

    for (let i = 0; i < nPairs; i++) {
      if (maxLength === null || lengths[i] < maxLength) {
        const weight = Math.max(1, Math.pow(lengths[i], 1.6));
        for (let w = 0; w < weight; w++) {
          candidates.push(i);
        }
      }
    }

    if (candidates.length === 0) break;

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

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === "__TEMP__") {
          grid[row][col] = null;
        }
      }
    }

    if (success) return path;
  }

  return null;
}

// -------------------------------------
// constructive bottleneck helpers
// -------------------------------------
function getFreeBorderCells(grid, size, side = null) {
  const cells = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== null) continue;
      const onBorder = isBorderCell([row, col], size);
      if (!onBorder) continue;

      if (side === "left" && col !== 0) continue;
      if (side === "right" && col !== size - 1) continue;
      if (side === "top" && row !== 0) continue;
      if (side === "bottom" && row !== size - 1) continue;

      cells.push([row, col]);
    }
  }

  return cells;
}

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

function shortestPathOnFreeGrid(grid, size, start, end, extraBlocked = new Set()) {
  const queue = [start];
  const visited = new Set([coordKey(start[0], start[1])]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();

    if (sameCell(current, end)) {
      const path = [];
      let curKey = coordKey(current[0], current[1]);

      while (curKey) {
        const cell = parseCoordKey(curKey);
        path.push(cell);
        curKey = parent.get(curKey);
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
      if (extraBlocked.has(key)) continue;

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

function buildForcedPath(grid, size, start, waypoints, end) {
  let fullPath = [start];
  const workingGrid = cloneGrid(grid);

  let current = start;
  const targets = [...waypoints, end];

  const blocked = new Set();

  for (const target of targets) {
    const segment = shortestPathOnFreeGrid(workingGrid, size, current, target, blocked);
    if (!segment) return null;

    for (let i = 1; i < segment.length; i++) {
      fullPath.push(segment[i]);
    }

    // segment außer letztem Punkt blocken
    for (let i = 0; i < segment.length - 1; i++) {
      const [r, c] = segment[i];
      workingGrid[r][c] = "__TEMP__";
      blocked.add(coordKey(r, c));
    }

    current = target;
  }

  // Sicherheitscheck: einfache Pfadstruktur
  const seen = new Set();
  for (let i = 0; i < fullPath.length; i++) {
    const key = coordKey(fullPath[i][0], fullPath[i][1]);
    if (seen.has(key)) return null;
    seen.add(key);

    if (i > 0 && !areNeighbors(fullPath[i - 1], fullPath[i])) {
      return null;
    }
  }

  return fullPath;
}

function forceBottleneckPaths(grid, size, colors) {
  const middle = Math.floor(size / 2);

  const leftStarts = getFreeBorderCells(grid, size, "left");
  const rightEnds = getFreeBorderCells(grid, size, "right");

  if (leftStarts.length === 0 || rightEnds.length === 0) {
    return null;
  }

  const startA = pickRandom(leftStarts.filter(c => c[0] >= 1 && c[0] <= size - 2));
  const endA = pickRandom(rightEnds.filter(c => c[0] >= 1 && c[0] <= size - 2));

  if (!startA || !endA) return null;

  const waypointA = [[middle, middle - 1], [middle, middle]];
  const pathA = buildForcedPath(grid, size, startA, waypointA, endA);
  if (!pathA) return null;

  placePathOnGrid(grid, pathA, colors[0]);

  return [
    {
      color: colors[0],
      start: pathA[0],
      end: pathA[pathA.length - 1],
      fullPath: pathA
    }
  ];
}

// -------------------------------------
// solution generation
// -------------------------------------
function generateSolvedSolution(size, nPairs, minLength = 3, maxAttempts = 60) {
  const colors = generateColorList(nPairs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);

    const forcedPairs = forceBottleneckPaths(grid, size, colors);
    if (!forcedPairs) continue;

    const usedCells = forcedPairs.reduce((sum, pair) => sum + pair.fullPath.length, 0);
    const remainingCells = size * size - usedCells;
    const remainingColors = colors.slice(1);

    if (remainingColors.length === 0) {
      if (remainingCells === 0) {
        return { size, pairs: forcedPairs };
      }
      continue;
    }

    if (remainingCells < remainingColors.length * minLength) continue;

    const maxReasonableLength = Math.ceil(remainingCells / remainingColors.length) + 3;

    const remainingLengths = randomSegmentLengths(
  remainingCells,
  remainingColors.length,
  minLength,
  maxReasonableLength
);

    const colorLengthPairs = remainingColors
      .map((color, i) => ({ color, length: remainingLengths[i] }))
      .sort((a, b) => b.length - a.length);

    const pairs = [...forcedPairs];
    let success = true;

    for (const entry of colorLengthPairs) {
      const path = generateSinglePath(grid, size, entry.length, 50, 1);
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

    const tooTrivial = pairs.some(pair => {
      const dist = manhattanDistance(pair.start, pair.end);
      return dist <= 1;
    });
    if (tooTrivial) continue;

    return { size, pairs };
  }

  return null;
}

// -------------------------------------
// puzzle extraction + soft solver
// -------------------------------------
function solutionToPuzzle(solution) {
  return {
    size: solution.size,
    pairs: solution.pairs.map(pair => ({
      color: pair.color,
      start: pair.start,
      end: pair.end
    }))
  };
}

function buildBlockedGridForColor(puzzle, solvedPaths, currentColor) {
  const grid = createEmptyGrid(puzzle.size, false);

  for (const pair of puzzle.pairs) {
    if (pair.color !== currentColor) {
      grid[pair.start[0]][pair.start[1]] = true;
      grid[pair.end[0]][pair.end[1]] = true;
    }
  }

  for (const path of Object.values(solvedPaths)) {
    for (const [r, c] of path) {
      grid[r][c] = true;
    }
  }

  return grid;
}

function enumeratePathsForColor(puzzle, pair, solvedPaths, limit = 3) {
  const blocked = buildBlockedGridForColor(puzzle, solvedPaths, pair.color);
  const results = [];
  const path = [pair.start];
  const visited = new Set([coordKey(pair.start[0], pair.start[1])]);

  function dfs(cell) {
    if (results.length >= limit) return;

    if (sameCell(cell, pair.end)) {
      results.push(path.slice());
      return;
    }

    let neighbors = getGridNeighbors(cell[0], cell[1], puzzle.size).filter(([nr, nc]) => {
      const key = coordKey(nr, nc);
      const isEnd = nr === pair.end[0] && nc === pair.end[1];
      return (!blocked[nr][nc] || isEnd) && !visited.has(key);
    });

    neighbors = neighbors.sort((a, b) => {
      const da = manhattanDistance(a, pair.end);
      const db = manhattanDistance(b, pair.end);
      return da - db;
    });

    for (const next of neighbors) {
      const key = coordKey(next[0], next[1]);
      visited.add(key);
      path.push(next);
      dfs(next);
      path.pop();
      visited.delete(key);
    }
  }

  dfs(pair.start);
  return results;
}

function countSolutionsSoft(puzzle, limit = 2) {
  let solutions = 0;

  function solveRec(solvedPaths) {
    if (solutions >= limit) return;

    const unresolved = puzzle.pairs.filter(pair => !solvedPaths[pair.color]);
    if (unresolved.length === 0) {
      solutions++;
      return;
    }

    let bestPair = null;
    let bestCandidates = null;

    for (const pair of unresolved) {
      const candidates = enumeratePathsForColor(puzzle, pair, solvedPaths, 3);

      if (candidates.length === 0) {
        return;
      }

      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestPair = pair;
        bestCandidates = candidates;
      }
    }

    for (const candidatePath of bestCandidates) {
      solveRec({
        ...solvedPaths,
        [bestPair.color]: candidatePath
      });

      if (solutions >= limit) return;
    }
  }

  solveRec({});
  return solutions;
}

// -------------------------------------
// scoring
// -------------------------------------
function isCenterCell(cell, size) {
  const [r, c] = cell;
  const mid1 = Math.floor((size - 1) / 2);
  const mid2 = Math.ceil((size - 1) / 2);
  return r >= mid1 && r <= mid2 && c >= mid1 && c <= mid2;
}

function countCenterUsage(solution) {
  let count = 0;
  for (const pair of solution.pairs) {
    for (const cell of pair.fullPath) {
      if (isCenterCell(cell, solution.size)) count++;
    }
  }
  return count;
}

function countPathsTouchingCenter(solution) {
  let count = 0;
  for (const pair of solution.pairs) {
    if (pair.fullPath.some(cell => isCenterCell(cell, solution.size))) count++;
  }
  return count;
}

function countEndpointCrowding(solution) {
  let crowding = 0;

  for (let i = 0; i < solution.pairs.length; i++) {
    for (let j = i + 1; j < solution.pairs.length; j++) {
      const a1 = solution.pairs[i].start;
      const a2 = solution.pairs[i].end;
      const b1 = solution.pairs[j].start;
      const b2 = solution.pairs[j].end;

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

function countPathAdjacencies(solution) {
  let adjacencyScore = 0;

  for (let i = 0; i < solution.pairs.length; i++) {
    const pathA = solution.pairs[i].fullPath;

    for (let j = i + 1; j < solution.pairs.length; j++) {
      const pathB = solution.pairs[j].fullPath;
      const setB = new Set(pathB.map(([r, c]) => `${r},${c}`));

      for (const [r, c] of pathA) {
        for (const [nr, nc] of getGridNeighbors(r, c, solution.size)) {
          if (setB.has(`${nr},${nc}`)) adjacencyScore++;
        }
      }
    }
  }

  return adjacencyScore;
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

function pathOverhead(pair) {
  const dist = manhattanDistance(pair.start, pair.end);
  const actual = pair.fullPath.length - 1;
  return actual - dist;
}

function countGratuitousDetours(solution) {
  let penalty = 0;

  for (const pair of solution.pairs) {
    const overhead = pathOverhead(pair);
    const turns = countPathTurns(pair.fullPath);
    const zigzags = countTinyZigzags(pair.fullPath);

    if (overhead >= 5) penalty += (overhead - 4) * 8;
    if (overhead >= 8) penalty += 12;
    if (overhead >= 4 && turns >= 6) penalty += 10;
    penalty += zigzags * 12;
  }

  return penalty;
}

function countDirectTemptations(solution) {
  let temptations = 0;

  for (const pair of solution.pairs) {
    const dist = manhattanDistance(pair.start, pair.end);
    const actual = pair.fullPath.length - 1;

    if (actual - dist >= 3) temptations++;
  }

  return temptations;
}

function evaluateSolutionDifficulty(solution) {
  let score = 0;
  let totalTurns = 0;
  let totalZigzags = 0;

  for (const pair of solution.pairs) {
    const dist = manhattanDistance(pair.start, pair.end);
    const length = pair.fullPath.length;

    score += dist * 8;

    if (dist <= 1) score -= 40;
    if (isBorderCell(pair.start, solution.size) && isBorderCell(pair.end, solution.size)) {
      score -= 20;
    }

    const turns = countPathTurns(pair.fullPath);
    const zigzags = countTinyZigzags(pair.fullPath);

    totalTurns += turns;
    totalZigzags += zigzags;

    score += Math.min(turns, Math.floor(length / 3));
    score -= zigzags * 14;

    if (length <= 4) score -= 12;
  }

  score += countCenterUsage(solution) * 4;
  score += countPathsTouchingCenter(solution) * 18;
  score += countEndpointCrowding(solution) * 4;
  score += countPathAdjacencies(solution) * 3;
  score += countDirectTemptations(solution) * 24;
  score -= totalZigzags * 10;
  score += Math.min(totalTurns, solution.size + solution.pairs.length * 3);
  score -= countGratuitousDetours(solution);

  return score;
}

// -------------------------------------
// world builder
// -------------------------------------
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

function generateHardCandidate(config) {
  let bestLevel = null;
  let bestScore = -Infinity;

  for (let i = 0; i < config.attempts; i++) {
    const solution = generateSolvedSolution(
      config.size,
      config.nPairs,
      config.minLength,
      config.generatorAttempts
    );

    if (!solution) continue;

    const detourPenalty = countGratuitousDetours(solution);
    if (detourPenalty > config.maxDetourPenalty) continue;

    const puzzle = solutionToPuzzle(solution);
    const solutionCount = countSolutionsSoft(puzzle, 2);
    const baseScore = evaluateSolutionDifficulty(solution);

    // Soft uniqueness scoring:
    // 1 Lösung = Bonus
    // 2 Lösungen = kleiner Malus
    // 0 = neutral behandeln (Solver ist absichtlich nur heuristisch)
    let finalScore = baseScore;
    if (solutionCount === 1) finalScore += 35;
    if (solutionCount === 2) finalScore -= 4;

    console.error(
      `  Kandidat: solutions=${solutionCount}, base=${baseScore}, final=${finalScore}, detour=${detourPenalty}`
    );

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestLevel = stripFullPaths(solution);
    }

    if (finalScore >= config.targetScore) {
      return stripFullPaths(solution);
    }
  }

  return bestLevel;
}

function buildHardWorld(config, count) {
  const levels = [];
  let tries = 0;
  const maxTries = count * config.maxWorldAttempts;

  while (levels.length < count && tries < maxTries) {
    tries++;
    console.error(`Hard world: Versuch ${tries}/${maxTries}, bisher ${levels.length}/${count}`);

    const level = generateHardCandidate(config);
    if (!level) continue;

    levels.push({
      id: `hard-${String(levels.length + 1).padStart(3, "0")}`,
      ...level
    });

    console.error(`Generated hard level ${levels.length}/${count}`);
  }

  if (levels.length === 0) {
    console.error("⚠️ Kein brauchbares Hard-Level gefunden.");
    return [];
  }

  return levels;
}

// -------------------------------------
// config
// -------------------------------------
const hardConfig = {
  size: 7,
  nPairs: 5,
  minLength: 3,
  attempts: 30,
  generatorAttempts: 180,
  targetScore: 120,
  maxWorldAttempts: 30,
  maxDetourPenalty: 50
};

const levelWorlds = {
  hard: buildHardWorld(hardConfig, 1)
};

console.log("const levelWorlds = " + JSON.stringify(levelWorlds, null, 2) + ";");
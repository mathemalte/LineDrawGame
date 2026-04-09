const board = document.getElementById("game-board");

function getNeighbors(cell, size) {
  const [row, col] = cell;
  const neighbors = [];

  if (row > 0) neighbors.push([row - 1, col]);
  if (row < size - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < size - 1) neighbors.push([row, col + 1]);

  return neighbors;
}

function generateLevelForDifficulty(difficulty) {
  const config = difficultySettings[difficulty];

  if (!config) {
    throw new Error(`Keine Difficulty-Konfiguration für: ${difficulty}`);
  }

if (config.generator === "multi") {
  const level = generateMultiplePathsLevel(
    config.size,
    config.nPairs,
    config.minLength || 3,
    400
  );

  if (level) {
    return level;
  }

  // nur als Notanker
  return generateMultiPathLevel(config.size, config.nPairs);
}

  if (config.generator === "v2") {
    return generateSolvableLevelV2(
      config.size,
      config.nPairs,
      config.options || {}
    );
  }

  if (config.generator === "fast") {
    return generateSolvableLevel(
      config.size,
      config.nPairs,
      config.minLength || 3
    );
  }

  throw new Error(`Unknown generator: ${config.generator}`);
}

function evaluateLevelDifficulty(level) {
  let score = 0;

  for (const pair of level.pairs) {
    const dist = manhattanDistance(pair.start, pair.end);

    score += dist * 5;

    if (dist <= 1) score -= 30;
    else if (dist === 2) score -= 15;
    else if (dist === 3) score -= 8;

    if (pair.start[0] === pair.end[0]) score -= 10;
    if (pair.start[1] === pair.end[1]) score -= 10;

    if (isBorderCell(pair.start, level.size) && isBorderCell(pair.end, level.size)) {
      score -= 10;
    }
  }

  return score;
}

function startDifficulty(difficulty) {
  currentDifficulty = difficulty;

  try {
    currentLevel = generateLevelForDifficulty(difficulty);
    loadGeneratedLevel(currentLevel);
    showGame();
    updateLevelIndicator();

    preGenerateNextLevel();
  } catch (error) {
    alert("Diese Schwierigkeit konnte gerade nicht geladen werden.");
  }
}

function nextGeneratedLevel() {
  if (!currentDifficulty) return;

  difficultyProgress[currentDifficulty] += 1;
  saveProgress();
  updateScoreboard();

  try {
    if (nextLevel) {
      currentLevel = nextLevel;
    } else {
      currentLevel = generateLevelForDifficulty(currentDifficulty);
    }

    loadGeneratedLevel(currentLevel);
    updateLevelIndicator();

    preGenerateNextLevel();
  } catch (error) {
    alert("Das nächste Level konnte nicht geladen werden.");
  }
}

function preGenerateNextLevel() {
  if (!currentDifficulty) return;

  setTimeout(() => {
    nextLevel = generateLevelForDifficulty(currentDifficulty);
  }, 50);
}

function resetCurrentLevel() {
  if (!currentLevel) return;
  loadGeneratedLevel(currentLevel);
  updateLevelIndicator();
}

function cellKey(cell) {
  return `${cell[0]}-${cell[1]}`;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function countFreeNeighbors(cell, visited, size) {
  return getNeighbors(cell, size).filter(n => !visited.has(cellKey(n))).length;
}

function generateHamiltonianPath(size, maxAttempts = 200) {
  const totalCells = size * size;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const visited = new Set();
    const path = [];

    const start = [
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size)
    ];

    function dfs(cell) {
      path.push(cell);
      visited.add(cellKey(cell));

      if (path.length === totalCells) {
        return true;
      }

      let neighbors = getNeighbors(cell, size).filter(
        n => !visited.has(cellKey(n))
      );

      // Warnsdorff-artige Heuristik:
      // zuerst Nachbarn mit wenig freien Anschlussmöglichkeiten
      neighbors = shuffleArray(neighbors).sort((a, b) => {
        return countFreeNeighbors(a, visited, size) - countFreeNeighbors(b, visited, size);
      });

      for (const next of neighbors) {
        if (dfs(next)) {
          return true;
        }
      }

      visited.delete(cellKey(cell));
      path.pop();
      return false;
    }

    if (dfs(start)) {
      return path;
    }
  }

  throw new Error(`Konnte keinen Hamilton-Pfad für ${size}x${size} erzeugen.`);
}

function generateColorList(count) {
  const baseColors = [
    "red", "blue", "green", "yellow", "purple",
    "cyan", "orange", "pink", "lime", "teal"
  ];

  return baseColors.slice(0, Math.min(count, baseColors.length));
}

function generateSnakePath(size) {
  const path = [];

  for (let row = 0; row < size; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < size; col++) {
        path.push([row, col]);
      }
    } else {
      for (let col = size - 1; col >= 0; col--) {
        path.push([row, col]);
      }
    }
  }

  return path;
}

function areNeighbors(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function backbiteMove(path, size) {
  if (path.length < 4) return path;

  const useFront = Math.random() < 0.5;
  const endpoint = useFront ? path[0] : path[path.length - 1];
  const neighbors = shuffleArray(getNeighbors(endpoint, size));

  for (const neighbor of neighbors) {
    const k = path.findIndex(cell => cell[0] === neighbor[0] && cell[1] === neighbor[1]);
    if (k === -1) continue;

    if (useFront) {
      // Nachbar darf nicht direkt v1 sein
      if (k <= 1) continue;

      // Neuer Pfad:
      // [v_{k-1}, ..., v1, v0, vk, vk+1, ...]
      const prefix = path.slice(1, k).reverse();
      const suffix = path.slice(k);
      return [...prefix, path[0], ...suffix];
    } else {
      // Nachbar darf nicht direkt v_{n-2} sein
      if (k >= path.length - 2) continue;

      // Neuer Pfad:
      // [v0, ..., vk, v_{n-1}, v_{n-2}, ..., v_{k+1}]
      const prefix = path.slice(0, k + 1);
      const suffix = path.slice(k + 1, path.length - 1).reverse();
      return [...prefix, path[path.length - 1], ...suffix];
    }
  }

  return path;
}

function generateTwistedPath(size, moveCount = 200) {
  let path = generateSnakePath(size);

  for (let i = 0; i < moveCount; i++) {
    path = backbiteMove(path, size);
  }

  return path;
}

function sameCell(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function findCellIndex(path, cell) {
  return path.findIndex(p => sameCell(p, cell));
}

function reverseSubpath(path, startIndex, endIndex) {
  const newPath = [...path];
  const segment = newPath.slice(startIndex, endIndex + 1).reverse();
  newPath.splice(startIndex, endIndex - startIndex + 1, ...segment);
  return newPath;
}

function tryTwist2x2(path, r, c) {
  const a = [r, c];
  const b = [r, c + 1];
  const c1 = [r + 1, c];
  const d = [r + 1, c + 1];

  const ia = findCellIndex(path, a);
  const ib = findCellIndex(path, b);
  const ic = findCellIndex(path, c1);
  const id = findCellIndex(path, d);

  if ([ia, ib, ic, id].some(i => i === -1)) return path;

  // sortiere nach Position im Pfad
  const block = [
    { cell: a, idx: ia },
    { cell: b, idx: ib },
    { cell: c1, idx: ic },
    { cell: d, idx: id }
  ].sort((x, y) => x.idx - y.idx);

  // nur wenn die 4 Zellen im Pfad als zusammenhängender Abschnitt vorkommen
  for (let i = 1; i < block.length; i++) {
    if (block[i].idx !== block[0].idx + i) {
      return path;
    }
  }

  const cellsInOrder = block.map(x => x.cell);

  // Mögliche lokale Ordnungen im 2x2
  const candidateOrders = [
    [a, b, d, c1],
    [a, c1, d, b],
    [b, a, c1, d],
    [b, d, c1, a],
    [c1, a, b, d],
    [c1, d, b, a],
    [d, b, a, c1],
    [d, c1, a, b]
  ];

  for (const candidate of candidateOrders) {
    let ok = true;

    for (let i = 0; i < 3; i++) {
      if (!areNeighbors(candidate[i], candidate[i + 1])) {
        ok = false;
        break;
      }
    }

    if (!ok) continue;

    // gleiche Ordnung überspringen
    let identical = true;
    for (let i = 0; i < 4; i++) {
      if (!sameCell(candidate[i], cellsInOrder[i])) {
        identical = false;
        break;
      }
    }
    if (identical) continue;

    const newPath = [...path];
    newPath.splice(block[0].idx, 4, ...candidate);

    // Randanschlüsse prüfen
    const beforeIdx = block[0].idx - 1;
    const afterIdx = block[0].idx + 4;

    if (beforeIdx >= 0) {
      if (!areNeighbors(newPath[beforeIdx], newPath[beforeIdx + 1])) {
        continue;
      }
    }

    if (afterIdx < newPath.length) {
      if (!areNeighbors(newPath[afterIdx - 1], newPath[afterIdx])) {
        continue;
      }
    }

    return newPath;
  }

  return path;
}

function generateSolvableLevel(size, nPairs, minLength = 3) {
  const totalCells = size * size;

  if (nPairs * minLength > totalCells) {
    throw new Error("Zu viele Farben oder minLength zu groß.");
  }

  const moveCount = size * size * 4;
  const fullPath = generateTwistedPath(size, moveCount);

  const lengths = randomSegmentLengths(totalCells, nPairs, minLength);
  const colors = generateColorList(nPairs);

  const pairs = [];
  let startIndex = 0;

  for (let i = 0; i < nPairs; i++) {
    const segmentLength = lengths[i];
    const segment = fullPath.slice(startIndex, startIndex + segmentLength);

    pairs.push({
      color: colors[i],
      start: segment[0],
      end: segment[segment.length - 1]
    });

    startIndex += segmentLength;
  }

  return {
    size,
    pairs
  };
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
        // längere Pfade werden mit höherer Wahrscheinlichkeit noch länger
        const weight = Math.max(1, lengths[i] * lengths[i]);
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

function generateSolvableLevelV2(size, nPairs, options = {}) {
  const {
    minLength = 4,
    maxLength = null
  } = options;

  const totalCells = size * size;

  if (nPairs * minLength > totalCells) {
    throw new Error("Zu viele Farben oder minLength zu groß.");
  }

  const fullPath = generateHamiltonianPath(size);
  const lengths = randomSegmentLengths(totalCells, nPairs, minLength, maxLength);
  const colors = generateColorList(nPairs);

  const pairs = [];
  let startIndex = 0;

  for (let i = 0; i < nPairs; i++) {
    const segmentLength = lengths[i];
    const segment = fullPath.slice(startIndex, startIndex + segmentLength);

    pairs.push({
      color: colors[i],
      start: segment[0],
      end: segment[segment.length - 1]
    });

    startIndex += segmentLength;
  }

  return {
    size,
    pairs
  };
}

let difficultyProgress = {
  easy: 1,
  medium: 1,
  hard: 1
};

function saveProgress() {
  localStorage.setItem("linedrawProgress", JSON.stringify(difficultyProgress));
}

function loadProgress() {
  const saved = localStorage.getItem("linedrawProgress");

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      difficultyProgress = {
        easy: parsed.easy || 1,
        medium: parsed.medium || 1,
        hard: parsed.hard || 1
      };
    } catch (error) {
      difficultyProgress = {
        easy: 1,
        medium: 1,
        hard: 1
      };
    }
  }
}

function coordKey(row, col) {
  return `${row},${col}`;
}

function parseCoordKey(key) {
  const [row, col] = key.split(",").map(Number);
  return [row, col];
}

function getGridNeighbors(row, col, size) {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]);
  if (row < size - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < size - 1) neighbors.push([row, col + 1]);
  return neighbors;
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

  const neighbors = getFreeNeighborsForPath(row, col, grid, size, visited);

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

function placePathOnGrid(grid, path, color) {
  for (const [row, col] of path) {
    grid[row][col] = color;
  }
}

function generateSinglePath(grid, size, length, maxAttempts = 200, minRemainingComponentSize = 2) {
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

    // Temp-Markierungen wieder zurücksetzen
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === "__TEMP__") {
          grid[row][col] = null;
        }
      }
    }

    if (success) {
      return path;
    }
  }

  return null;
}

function generateMultiplePathsLevel(size, nPairs, minLength = 3, maxAttempts = 200) {
  const colors = generateColorList(nPairs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const totalCells = size * size;

    const rawLengths = randomSegmentLengths(totalCells, nPairs, minLength);

    // Lange Pfade zuerst platzieren
    const colorLengthPairs = colors.map((color, i) => ({
      color,
      length: rawLengths[i]
    })).sort((a, b) => b.length - a.length);

    const pairs = [];
    let success = true;

    for (const entry of colorLengthPairs) {
      const path = generateSinglePath(grid, size, entry.length, 200, 2);

      if (!path) {
        success = false;
        break;
      }

      placePathOnGrid(grid, path, entry.color);

      pairs.push({
        color: entry.color,
        start: path[0],
        end: path[path.length - 1]
      });
    }

    if (!success) {
      continue;
    }

    if (countFreeCells(grid) !== 0) {
      continue;
    }

    return {
      size,
      pairs
    };
  }

  return null;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
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

function getRegionFrontier(regionCells, grid, size) {
  const frontier = [];

  for (const key of regionCells) {
    const [row, col] = parseCoordKey(key);
    for (const [nr, nc] of getGridNeighbors(row, col, size)) {
      if (grid[nr][nc] === null) {
        frontier.push([nr, nc]);
      }
    }
  }

  return frontier;
}

function countRegionNeighbors(cellKey, regionCells, size) {
  const [row, col] = parseCoordKey(cellKey);
  let count = 0;

  for (const [nr, nc] of getGridNeighbors(row, col, size)) {
    const nKey = coordKey(nr, nc);
    if (regionCells.has(nKey)) {
      count++;
    }
  }

  return count;
}

function isRegionSimplePath(region, size) {
  const cells = region.cells;

  if (cells.size < 2) return false;

  let degree1 = 0;

  for (const key of cells) {
    const degree = countRegionNeighbors(key, cells, size);

    if (degree === 1) {
      degree1++;
    } else if (degree === 2) {
      // okay
    } else {
      // Grad 0, 3, 4 ... => kein einfacher Pfad
      return false;
    }
  }

  return degree1 === 2;
}

function areAllRegionsSimplePaths(regions, size) {
  return regions.every(region => isRegionSimplePath(region, size));
}

function countSameColorNeighbors(row, col, color, grid, size) {
  let count = 0;

  for (const [nr, nc] of getGridNeighbors(row, col, size)) {
    if (grid[nr][nc] === color) {
      count++;
    }
  }

  return count;
}

function floodFillFreeCells(grid, size, startRow, startCol, visited) {
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

function getFreeComponents(grid, size) {
  const visited = new Set();
  const components = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = coordKey(row, col);
      if (grid[row][col] === null && !visited.has(key)) {
        const component = floodFillFreeCells(grid, size, row, col, visited);
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

  for (const component of components) {
    // Zu kleine freie Komponenten sind später unbrauchbar
    if (component.length < minLength) {
      return false;
    }
  }

  return true;
}

function createsTinyHole(grid, size, minComponentSize = 2) {
  const components = getFreeComponents(grid, size);
  return components.some(component => component.length < minComponentSize);
}

function generateRegionPartition(size, nPairs, maxAttempts = 200) {
  const colors = generateColorList(nPairs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);

    const regions = colors.map(color => ({
      color,
      cells: new Set()
    }));

    // zufällige Startseeds setzen
    let placed = 0;
    while (placed < nPairs) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);

      if (grid[row][col] !== null) continue;

      grid[row][col] = colors[placed];
      regions[placed].cells.add(coordKey(row, col));
      placed++;
    }

    let safety = size * size * 20;

    while (countFreeCells(grid) > 0 && safety > 0) {
      safety--;

      const growableRegions = regions.filter(region => {
        let frontier = getRegionFrontier(region.cells, grid, size);

      frontier = shuffleArray(frontier).sort((a, b) => {
        const scoreA = countSameColorNeighbors(a[0], a[1], region.color, grid, size);
        const scoreB = countSameColorNeighbors(b[0], b[1], region.color, grid, size);

  // weniger gleiche Nachbarn zuerst => schmalere, pfadartigere Formen
  return scoreA - scoreB;
});
        return frontier.length > 0;
      });

      if (growableRegions.length === 0) break;

      const region = pickRandom(growableRegions);
      const frontier = shuffleArray(getRegionFrontier(region.cells, grid, size));

      let placedCell = false;

      for (const [row, col] of frontier) {
        grid[row][col] = region.color;

        // verhindern, dass winzige isolierte Löcher entstehen
        if (!createsTinyHole(grid, size, 2)) {
          region.cells.add(coordKey(row, col));
          placedCell = true;
          break;
        }

        grid[row][col] = null;
      }

      if (!placedCell) {
        // fallback: trotzdem irgendeine Frontier nehmen
        const fallback = getRegionFrontier(region.cells, grid, size);
        if (fallback.length > 0) {
          const [row, col] = fallback[0];
          grid[row][col] = region.color;
          region.cells.add(coordKey(row, col));
        }
      }
    }

    if (countFreeCells(grid) > 0) continue;

    return { grid, regions };
  }

  throw new Error("Konnte keine vollständige Regionenaufteilung erzeugen.");
}

function getRegionAdjacency(regionCells, size) {
  const adjacency = new Map();

  for (const key of regionCells) {
    adjacency.set(key, []);
  }

  for (const key of regionCells) {
    const [row, col] = parseCoordKey(key);

    for (const [nr, nc] of getGridNeighbors(row, col, size)) {
      const nKey = coordKey(nr, nc);
      if (regionCells.has(nKey)) {
        adjacency.get(key).push(nKey);
      }
    }
  }

  return adjacency;
}

function bfsFarthest(startKey, adjacency) {
  const queue = [startKey];
  const visited = new Set([startKey]);
  const distance = new Map([[startKey, 0]]);
  let farthest = startKey;

  while (queue.length > 0) {
    const current = queue.shift();

    if (distance.get(current) > distance.get(farthest)) {
      farthest = current;
    }

    for (const next of adjacency.get(current) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        distance.set(next, distance.get(current) + 1);
        queue.push(next);
      }
    }
  }

  return { farthest, distance };
}

function chooseRegionEndpoints(region, size) {
  const cellKeys = Array.from(region.cells);
  const startKey = pickRandom(cellKeys);

  const adjacency = getRegionAdjacency(region.cells, size);
  const first = bfsFarthest(startKey, adjacency);
  const second = bfsFarthest(first.farthest, adjacency);

  const start = parseCoordKey(first.farthest);
  const end = parseCoordKey(second.farthest);

  return { start, end };
}

function generateMultiPathLevel(size, nPairs, maxAttempts = 1200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { regions } = generateRegionPartition(size, nPairs);

    if (!areAllRegionsSimplePaths(regions, size)) {
      continue;
    }

    const pairs = regions.map(region => {
      const endpoints = [];

      for (const key of region.cells) {
        const degree = countRegionNeighbors(key, region.cells, size);
        if (degree === 1) {
          endpoints.push(parseCoordKey(key));
        }
      }

      if (endpoints.length !== 2) {
        return null;
      }

      return {
        color: region.color,
        start: endpoints[0],
        end: endpoints[1]
      };
    });

    if (pairs.some(pair => pair === null)) {
      continue;
    }

    return {
      size,
      pairs
    };
  }

  // Fallback statt kompletter Fehler
  return generateSolvableLevel(size, nPairs, 2);
}

const difficultySettings = {
  easy: {
    size: 5,
    nPairs: 4,
    generator: "multi",
    minLength: 3
  },
  medium: {
    size: 6,
    nPairs: 6,
    generator: "multi",
    minLength: 3
  },
  hard: {
    size: 7,
    nPairs: 7,
    generator: "multi",
    minLength: 3
  }
};

let currentDifficulty = "easy";
let level = null;
let gridSize = null;

let isDrawing = false;
let currentColor = null;
let currentPath = [];
let startEndpointCell = null;
let currentLevel = null;
let nextLevel = null;

const paths = {};
const completed = {};

function getCell(row, col) {
  return document.querySelector(
    `.cell[data-row='${row}'][data-col='${col}']`
  );
}

function getNeighborsInPath(path, index) {
  const prev = index > 0 ? path[index - 1] : null;
  const next = index < path.length - 1 ? path[index + 1] : null;
  return { prev, next };
}

function manhattanDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function isBorderCell(cell, size) {
  const [r, c] = cell;
  return r === 0 || c === 0 || r === size - 1 || c === size - 1;
}

function generateInterestingLevel(difficulty) {
  const config = difficultySettings[difficulty];

  let attempts = 5;
  if (difficulty === "easy") attempts = 4;
  if (difficulty === "medium") attempts = 8;
  if (difficulty === "hard") attempts = 10;

  let bestLevel = null;
  let bestScore = -Infinity;

  for (let i = 0; i < attempts; i++) {
    let candidate;

    if (config.generator === "v2") {
      candidate = generateSolvableLevelV2(
        config.size,
        config.nPairs,
        config.options || {}
      );
    } else if (config.generator === "fast") {
      candidate = generateSolvableLevel(
        config.size,
        config.nPairs,
        config.minLength || 3
      );
    } else if (config.generator === "multi") {
      candidate = generateMultiPathLevel(
        config.size,
        config.nPairs
      );
    } else {
      throw new Error(`Unknown generator: ${config.generator}`);
    }

    const score = evaluateLevelDifficulty(candidate);

    if (score > bestScore) {
      bestScore = score;
      bestLevel = candidate;
    }
  }

  return bestLevel;
}

function getDirection(fromCell, toCell) {
  if (!fromCell || !toCell) return null;

  const fromRow = Number(fromCell.dataset.row);
  const fromCol = Number(fromCell.dataset.col);
  const toRow = Number(toCell.dataset.row);
  const toCol = Number(toCell.dataset.col);

  if (toRow === fromRow - 1 && toCol === fromCol) return "up";
  if (toRow === fromRow + 1 && toCol === fromCol) return "down";
  if (toRow === fromRow && toCol === fromCol - 1) return "left";
  if (toRow === fromRow && toCol === fromCol + 1) return "right";

  return null;
}

function clearPipeClasses(cell) {
  const pipe = cell.querySelector(".pipe");
  if (!pipe) return;

  pipe.className = "pipe";
  pipe.innerHTML = "";
}

function applyPipeShape(cell, color, connections, isEndpoint = false) {
  const pipe = cell.querySelector(".pipe");
  if (!pipe) return;

  pipe.className = "pipe";
  pipe.innerHTML = "";

  pipe.classList.add(color);

  if (isEndpoint) {
    pipe.classList.add("endpoint-pipe");
  }

  connections.forEach(dir => {
    const segment = document.createElement("div");
    segment.classList.add("segment", dir);
    pipe.appendChild(segment);
  });
}

function renderPath(color) {
  const path = paths[color];
  if (!path || path.length === 0) return;

  path.forEach((cell, index) => {
    clearPipeClasses(cell);

    const { prev, next } = getNeighborsInPath(path, index);
    const connections = [];

    const dirToPrev = getDirection(cell, prev);
    const dirToNext = getDirection(cell, next);

    if (dirToPrev) connections.push(dirToPrev);
    if (dirToNext) connections.push(dirToNext);

    const isEndpoint = cell.dataset.endpoint === "true";
    applyPipeShape(cell, color, connections, isEndpoint);
  });
}

function renderAllPaths() {
  document.querySelectorAll(".cell").forEach(cell => {
    const pipe = cell.querySelector(".pipe");
    if (pipe) {
      pipe.className = "pipe";
      pipe.innerHTML = "";
    }
  });

  if (!level) return;

  level.pairs.forEach(pair => {
    const startCell = getCell(pair.start[0], pair.start[1]);
    const endCell = getCell(pair.end[0], pair.end[1]);

    if (startCell) applyPipeShape(startCell, pair.color, [], true);
    if (endCell) applyPipeShape(endCell, pair.color, [], true);
  });

  Object.keys(paths).forEach(color => {
    renderPath(color);
  });

  if (isDrawing && currentColor && currentPath.length > 0) {
    currentPath.forEach((cell, index) => {
      clearPipeClasses(cell);

      const { prev, next } = getNeighborsInPath(currentPath, index);
      const connections = [];

      const dirToPrev = getDirection(cell, prev);
      const dirToNext = getDirection(cell, next);

      if (dirToPrev) connections.push(dirToPrev);
      if (dirToNext) connections.push(dirToNext);

      const isEndpoint = cell.dataset.endpoint === "true";
      applyPipeShape(cell, currentColor, connections, isEndpoint);
    });
  }
}

function setPoints() {
  level.pairs.forEach(pair => {
    const [sr, sc] = pair.start;
    const [er, ec] = pair.end;

    const startCell = getCell(sr, sc);
    const endCell = getCell(er, ec);

    startCell.dataset.color = pair.color;
    endCell.dataset.color = pair.color;

    startCell.dataset.endpoint = "true";
    endCell.dataset.endpoint = "true";
  });

  renderAllPaths();
}

function isAdjacent(cellA, cellB) {
  const rowA = Number(cellA.dataset.row);
  const colA = Number(cellA.dataset.col);
  const rowB = Number(cellB.dataset.row);
  const colB = Number(cellB.dataset.col);

  const rowDiff = Math.abs(rowA - rowB);
  const colDiff = Math.abs(colA - colB);

  return rowDiff + colDiff === 1;
}

function clearPath(color, force = false) {
  if (!paths[color]) return;

  // Fertige Linien nur löschen, wenn es die eigene Farbe ist und force=true
  if (completed[color] && !force) {
    return;
  }

  paths[color].forEach(cell => {
    if (cell.dataset.endpoint !== "true") {
      delete cell.dataset.color;
      delete cell.dataset.locked;
    }
  });

  paths[color] = [];
  completed[color] = false;
}

function clearCurrentPath() {
  currentPath.forEach(cell => {
    if (cell.dataset.endpoint !== "true") {
      delete cell.dataset.color;
      delete cell.dataset.locked;
    }
  });
}

function trimCurrentPathTo(cell) {
  const index = currentPath.indexOf(cell);
  if (index === -1) return;

  for (let i = currentPath.length - 1; i > index; i--) {
    const toRemove = currentPath[i];

    if (toRemove.dataset.endpoint !== "true") {
      delete toRemove.dataset.color;
      delete toRemove.dataset.locked;
    }
  }

  currentPath = currentPath.slice(0, index + 1);
}

function isCorrectEndpoint(cell, color) {
  const pair = level.pairs.find(p => p.color === color);
  if (!pair || !startEndpointCell) return false;

  const [sr, sc] = pair.start;
  const [er, ec] = pair.end;

  const startIsPairStart =
    Number(startEndpointCell.dataset.row) === sr &&
    Number(startEndpointCell.dataset.col) === sc;

  const startIsPairEnd =
    Number(startEndpointCell.dataset.row) === er &&
    Number(startEndpointCell.dataset.col) === ec;

  // Wenn man beim offiziellen Startpunkt begonnen hat,
  // muss man beim offiziellen Endpunkt landen
  if (startIsPairStart) {
    return (
      Number(cell.dataset.row) === er &&
      Number(cell.dataset.col) === ec
    );
  }

  // Wenn man beim offiziellen Endpunkt begonnen hat,
  // muss man beim offiziellen Startpunkt landen
  if (startIsPairEnd) {
    return (
      Number(cell.dataset.row) === sr &&
      Number(cell.dataset.col) === sc
    );
  }

  return false;
}

function checkWin() {
  for (let color in completed) {
    if (!completed[color]) {
      return false;
    }
  }

  const allCells = document.querySelectorAll(".cell");
  for (let cell of allCells) {
    if (!cell.dataset.color) {
      return false;
    }
  }

  return true;
}

function showWinMessage() {
  const msg = document.getElementById("win-message");
  if (msg) msg.style.display = "block";
}

function hideWinMessage() {
  const msg = document.getElementById("win-message");
  if (msg) msg.style.display = "none";
}

function showNextLevelButton() {
  const btn = document.getElementById("next-level-btn");
  if (btn) btn.style.display = "inline-block";
}

function hideNextLevelButton() {
  const btn = document.getElementById("next-level-btn");
  if (btn) btn.style.display = "none";
}

function showMenu() {
  const menu = document.getElementById("menu-screen");
  const boardEl = document.getElementById("game-board");
  const buttonRow = document.querySelector(".button-row");
  const levelIndicator = document.getElementById("level-indicator");
  const winMessage = document.getElementById("win-message");
  const backBtn = document.getElementById("back-to-menu-btn");

  if (menu) menu.style.display = "block";
  if (boardEl) boardEl.style.display = "none";
  if (buttonRow) buttonRow.style.display = "none";
  if (levelIndicator) levelIndicator.style.display = "none";
  if (winMessage) winMessage.style.display = "none";
  if (backBtn) backBtn.style.display = "none";
}

function showGame() {
  const menu = document.getElementById("menu-screen");
  const boardEl = document.getElementById("game-board");
  const buttonRow = document.querySelector(".button-row");
  const levelIndicator = document.getElementById("level-indicator");
  const backBtn = document.getElementById("back-to-menu-btn");

  if (menu) menu.style.display = "none";
  if (boardEl) boardEl.style.display = "grid";
  if (buttonRow) buttonRow.style.display = "flex";
  if (levelIndicator) levelIndicator.style.display = "block";
  if (backBtn) backBtn.style.display = "inline-block";
}

function renderDifficultyButtons() {
  const container = document.getElementById("difficulty-buttons");
  if (!container) return;

  container.innerHTML = "";

  Object.keys(difficultySettings).forEach(difficulty => {
    const btn = document.createElement("button");
    btn.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    btn.addEventListener("click", () => {
      startDifficulty(difficulty);
    });

    container.appendChild(btn);
  });
}

function startDrawing(cell) {
  if (cell.dataset.endpoint !== "true") return;

  hideWinMessage();
  hideNextLevelButton();

  const color = cell.dataset.color;

  currentColor = color;
  isDrawing = true;
  startEndpointCell = cell;

  // Nur eigene Linie darf beim Neustart gelöscht werden
  clearPath(currentColor, true);

  currentPath = [cell];
  renderAllPaths();
}

function continueDrawingStep(cell) {
  if (!isDrawing || !currentColor) return false;

  const lastCell = currentPath[currentPath.length - 1];
  if (!lastCell) return false;

  // nur direkte Nachbarn
  if (!isAdjacent(lastCell, cell)) return false;

  // Fremde Endpunkte nie betreten
  if (cell.dataset.endpoint === "true" && cell.dataset.color !== currentColor) {
    return false;
  }

  // In eigene aktuelle Linie zurück => kürzen
  if (currentPath.includes(cell)) {
    trimCurrentPathTo(cell);
    renderAllPaths();
    return true;
  }

  // Gelockte fremde Linien niemals überschreiben
  if (
    cell.dataset.locked === "true" &&
    cell.dataset.color !== currentColor
  ) {
    return false;
  }

  // Fremde unfertige Linien dürfen aufgelöst werden
  if (
    cell.dataset.color &&
    cell.dataset.color !== currentColor &&
    cell.dataset.endpoint !== "true"
  ) {
    clearPath(cell.dataset.color, false);
  }

  if (cell.dataset.endpoint !== "true") {
    cell.dataset.color = currentColor;
    delete cell.dataset.locked;
  }

  currentPath.push(cell);
  return true;
}

function getInterpolatedCells(fromCell, toCell) {
  const fromRow = Number(fromCell.dataset.row);
  const fromCol = Number(fromCell.dataset.col);
  const toRow = Number(toCell.dataset.row);
  const toCol = Number(toCell.dataset.col);

  const cells = [];

  let row = fromRow;
  let col = fromCol;

  while (row !== toRow || col !== toCol) {
    const rowDiff = toRow - row;
    const colDiff = toCol - col;

    // Bevorzuge die Richtung mit größerer Distanz
    if (Math.abs(rowDiff) > Math.abs(colDiff)) {
      row += Math.sign(rowDiff);
    } else if (colDiff !== 0) {
      col += Math.sign(colDiff);
    } else if (rowDiff !== 0) {
      row += Math.sign(rowDiff);
    }

    const nextCell = getCell(row, col);
    if (nextCell) {
      cells.push(nextCell);
    } else {
      break;
    }
  }

  return cells;
}

function continueDrawing(cell) {
  if (!isDrawing || !currentColor) return;

  const lastCell = currentPath[currentPath.length - 1];
  if (!lastCell || cell === lastCell) return;

  const cellsToTraverse = getInterpolatedCells(lastCell, cell);

  let changed = false;

  for (const nextCell of cellsToTraverse) {
    const success = continueDrawingStep(nextCell);

    if (!success) {
      break;
    }

    changed = true;
  }

  if (changed) {
    renderAllPaths();
  }
}

function stopDrawing() {
  if (!currentColor || currentPath.length === 0) {
    isDrawing = false;
    currentColor = null;
    currentPath = [];
    startEndpointCell = null;
    renderAllPaths();
    return;
  }

  const drawnColor = currentColor;
  const lastCell = currentPath[currentPath.length - 1];

  if (isCorrectEndpoint(lastCell, drawnColor)) {
    paths[drawnColor] = [...currentPath];
    completed[drawnColor] = true;

    paths[drawnColor].forEach(cell => {
      cell.dataset.locked = "true";
    });
  } else {
    clearCurrentPath();
    paths[drawnColor] = [];
    completed[drawnColor] = false;
  }

  // GANZ WICHTIG: erst Zeichenzustand zurücksetzen,
  // dann neu rendern
  isDrawing = false;
  currentColor = null;
  currentPath = [];

  renderAllPaths();

  if (checkWin()) {
  showWinMessage();
  showNextLevelButton();
}
}

function getCellFromPointerEvent(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element ? element.closest(".cell") : null;
}

function addEventListeners() {
  board.onpointerdown = null;
  board.onpointermove = null;
  board.onpointerup = null;
  board.onpointerleave = null;
  board.onpointercancel = null;

  board.onpointerdown = (event) => {
    const cell = event.target.closest(".cell");
    if (!cell) return;

    event.preventDefault();
    board.setPointerCapture?.(event.pointerId);
    startDrawing(cell);
  };

  board.onpointermove = (event) => {
    if (!isDrawing) return;

    event.preventDefault();

    const cell = getCellFromPointerEvent(event);
    if (cell) {
      continueDrawing(cell);
    }
  };

  board.onpointerup = (event) => {
    event.preventDefault();
    stopDrawing();
  };

  board.onpointerleave = (event) => {
    if (!isDrawing) return;
    event.preventDefault();
  };

  board.onpointercancel = (event) => {
    event.preventDefault();
    stopDrawing();
  };
}

function loadGeneratedLevel(levelData) {
  level = levelData;
  gridSize = level.size;

  board.innerHTML = "";

  for (let key in paths) delete paths[key];
  for (let key in completed) delete completed[key];

  level.pairs.forEach(pair => {
    paths[pair.color] = [];
    completed[pair.color] = false;
  });

  const uiOffset = 160;
  const maxWidth = window.innerWidth;
  const maxHeight = window.innerHeight - uiOffset;

  const maxSize = Math.min(maxWidth, maxHeight) * 0.95;
  const cellSize = Math.floor(maxSize / gridSize);

  const pipeThickness = Math.max(12, Math.floor(cellSize * 0.22));
  const endpointSize = Math.max(20, Math.floor(cellSize * 0.34));
  const endpointRing = Math.max(5, Math.floor(cellSize * 0.09));

  board.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
  board.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

  board.style.setProperty("--cell-size", `${cellSize}px`);
  board.style.setProperty("--pipe-thickness", `${pipeThickness}px`);
  board.style.setProperty("--endpoint-size", `${endpointSize}px`);
  board.style.setProperty("--endpoint-ring", `${endpointRing}px`);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;

      const pipe = document.createElement("div");
      pipe.classList.add("pipe");

      cell.appendChild(pipe);
      board.appendChild(cell);
    }
  }

  setPoints();
  addEventListeners();
  hideWinMessage();
  hideNextLevelButton();
  renderAllPaths();
}

function updateLevelIndicator() {
  const indicator = document.getElementById("level-indicator");
  if (!indicator || !currentDifficulty) return;

  indicator.textContent =
    `${currentDifficulty.toUpperCase()} – Level ${difficultyProgress[currentDifficulty]}`;
}

function resetProgress() {
  difficultyProgress = {
    easy: 1,
    medium: 1,
    hard: 1
  };

  saveProgress();
  updateScoreboard();
  updateLevelIndicator();
}

function updateScoreboard() {
  const easy = document.getElementById("score-easy");
  const medium = document.getElementById("score-medium");
  const hard = document.getElementById("score-hard");

  if (easy) {
    easy.textContent = `Easy: Level ${difficultyProgress.easy}`;
  }

  if (medium) {
    medium.textContent = `Medium: Level ${difficultyProgress.medium}`;
  }

  if (hard) {
    hard.textContent = `Hard: Level ${difficultyProgress.hard}`;
  }
}

const resetProgressBtn = document.getElementById("reset-progress-btn");

if (resetProgressBtn) {
  resetProgressBtn.addEventListener("click", () => {
    resetProgress();
    alert("Fortschritt zurückgesetzt.");
  });
}

const nextLevelBtn = document.getElementById("next-level-btn");
if (nextLevelBtn) {
  nextLevelBtn.addEventListener("click", () => {
    nextGeneratedLevel();
  });
}

const resetBtn = document.getElementById("reset-btn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetCurrentLevel();
  });
}

const backBtn = document.getElementById("back-to-menu-btn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    showMenu();
  });
}
loadProgress();
renderDifficultyButtons();
updateScoreboard();
showMenu();
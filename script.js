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

  try {
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

    throw new Error(`Unbekannter Generator: ${config.generator}`);
  } catch (error) {
    alert("Beim Generieren dieses Levels ist ein Fehler aufgetreten. Es wird ein Ersatzlevel geladen.");
    return generateSolvableLevel(5, 4, 3);
  }
}

function startDifficulty(difficulty) {
  currentDifficulty = difficulty;

  try {
    currentLevel = generateLevelForDifficulty(difficulty);
    loadGeneratedLevel(currentLevel);
    showGame();
    updateLevelIndicator();
  } catch (error) {
    alert("Diese Schwierigkeit konnte gerade nicht geladen werden.");
  }
}

function nextGeneratedLevel() {
  if (!currentDifficulty) return;

  difficultyProgress[currentDifficulty] += 1;
  saveProgress();
  updateScoreboard();

  currentLevel = generateLevelForDifficulty(currentDifficulty);
  loadGeneratedLevel(currentLevel);
  updateLevelIndicator();
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

function generateSolvableLevel(size, nPairs, minLength = 3) {
  const totalCells = size * size;

  if (nPairs * minLength > totalCells) {
    throw new Error("Zu viele Farben oder minLength zu groß.");
  }

  const fullPath = generateSnakePath(size);
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
  const lengths = Array(nPairs).fill(minLength);
  let remaining = totalCells - nPairs * minLength;

  while (remaining > 0) {
    const candidates = [];
    for (let i = 0; i < nPairs; i++) {
      if (maxLength === null || lengths[i] < maxLength) {
        candidates.push(i);
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

const difficultySettings = {
  easy: {
    size: 5,
    nPairs: 4,
    generator: "fast",
    minLength: 3
  },
  medium: {
    size: 7,
    nPairs: 6,
    generator: "fast",
    minLength: 4
  },
  hard: {
    size: 8,
    nPairs: 7,
    generator: "fast",
    minLength: 5
  }
};

let currentDifficulty = "easy";
let currentLevelIndex = null;
let level = null;
let gridSize = null;

let isDrawing = false;
let currentColor = null;
let currentPath = [];
let startEndpointCell = null;
let currentLevel = null;

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

function updateLevelIndicator() {
  const indicator = document.getElementById("level-indicator");
  if (indicator && currentDifficulty !== null && currentLevelIndex !== null) {
    indicator.textContent = `${currentDifficulty.toUpperCase()} – Level ${currentLevelIndex + 1}`;
  }
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

function renderLevelButtons() {
  const container = document.getElementById("level-buttons");
  if (!container) return;

  container.innerHTML = "";

  const levelsForDifficulty = levelGroups[currentDifficulty];
  if (!levelsForDifficulty) return;

  levelsForDifficulty.forEach((_, index) => {
    const btn = document.createElement("button");
    btn.textContent = `Level ${index + 1}`;

    btn.addEventListener("click", () => {
      loadLevel(currentDifficulty, index);
      showGame();
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

function continueDrawing(cell) {
  if (!isDrawing || !currentColor) return;

  const lastCell = currentPath[currentPath.length - 1];
  if (!isAdjacent(lastCell, cell)) return;

  // Fremde Endpunkte nie betreten
  if (cell.dataset.endpoint === "true" && cell.dataset.color !== currentColor) {
    return;
  }

  // In eigene aktuelle Linie zurück => kürzen
  if (currentPath.includes(cell)) {
    trimCurrentPathTo(cell);
    renderAllPaths();
    return;
  }

  // Gelockte fremde Linien niemals überschreiben
  if (
    cell.dataset.locked === "true" &&
    cell.dataset.color !== currentColor
  ) {
    return;
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
  renderAllPaths();
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

function regenerateCurrentLevel() {
  const key = `${currentDifficulty}-${currentLevelIndex}`;
  delete generatedLevelCache[key];
  loadLevel(currentDifficulty, currentLevelIndex);
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
renderLevelButtons();
updateScoreboard();
showMenu();
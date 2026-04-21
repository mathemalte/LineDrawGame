const board = document.getElementById("game-board");

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function getPrebuiltLevel(difficulty) {
  const levels = levelWorlds[difficulty];

  if (!levels || levels.length === 0) {
    throw new Error(`Keine Levels für ${difficulty}`);
  }

  const index = Math.min(
  difficultyProgress[difficulty],
  levels.length - 1
);

  return levels[index];
}

function startDifficulty(difficulty) {
  currentDifficulty = difficulty;

  try {
    currentLevel = getPrebuiltLevel(difficulty);
    loadGeneratedLevel(currentLevel);
    showGame();
    updateLevelIndicator();
  } catch (error) {
    alert("Diese Schwierigkeit konnte gerade nicht geladen werden.");
  }
}

function nextGeneratedLevel() {
  if (!currentDifficulty) return;

  pendingPointerCell = null;
  lastProcessedCell = null;
  animationFrameScheduled = false;
  isDrawing = false;
  currentColor = null;
  currentPath = [];
  startEndpointCell = null;

  difficultyProgress[currentDifficulty] += 1;
  saveProgress();
  updateScoreboard();

  try {
    currentLevel = getPrebuiltLevel(currentDifficulty);
    loadGeneratedLevel(currentLevel);
    updateLevelIndicator();
  } catch (error) {
    alert("Das nächste Level konnte nicht geladen werden.");
  }
}

function resetCurrentLevel() {
  if (!currentLevel) return;
  loadGeneratedLevel(currentLevel);
  updateLevelIndicator();
}

let difficultyProgress = {
  easy: 0,
  medium: 0,
  hard: 0
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
        easy: typeof parsed.easy === "number" ? parsed.easy : 0,
        medium: typeof parsed.medium === "number" ? parsed.medium : 0,
        hard: typeof parsed.hard === "number" ? parsed.hard : 0
      };
    } catch (error) {
      difficultyProgress = {
        easy: 0,
        medium: 0,
        hard: 0
      };
    }
  }
}

let currentDifficulty = null;
let level = null;
let gridSize = null;

let isDrawing = false;
let currentColor = null;
let currentPath = [];
let startEndpointCell = null;
let currentLevel = null;

let pendingPointerCell = null;
let animationFrameScheduled = false;
let lastProcessedCell = null;

let isTimeMode = false;
let timeModeSecondsLeft = 120;
let timeModeSolvedCount = 0;
let timeModeTimerId = null;

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

function animateEndpoint(cell, success = false) {
  if (!cell) return;

  cell.classList.remove("endpoint-animate", "endpoint-success");

  // Reflow erzwingen, damit die Animation neu startet
  void cell.offsetWidth;

  const className = success ? "endpoint-success" : "endpoint-animate";
  cell.classList.add(className);

  setTimeout(() => {
    cell.classList.remove(className);
  }, success ? 350 : 220);
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

function isCellEqualToPathEnd(cell, path, atStart = false) {
  if (!path || path.length === 0) return false;

  const target = atStart ? path[0] : path[path.length - 1];

  return (
    Number(cell.dataset.row) === Number(target.dataset.row) &&
    Number(cell.dataset.col) === Number(target.dataset.col)
  );
}

function reverseCurrentPathCells(path) {
  return [...path].reverse();
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

function isSameBoardCell(a, b) {
  if (!a || !b) return false;

  return (
    Number(a.dataset.row) === Number(b.dataset.row) &&
    Number(a.dataset.col) === Number(b.dataset.col)
  );
}

function trimStoredPathToRange(color, keptPath, oldPath) {
  const keptSet = new Set(
    keptPath.map(cell => `${cell.dataset.row},${cell.dataset.col}`)
  );

  oldPath.forEach(cell => {
    const key = `${cell.dataset.row},${cell.dataset.col}`;

    if (!keptSet.has(key) && cell.dataset.endpoint !== "true") {
      delete cell.dataset.color;
      delete cell.dataset.locked;
    }
  });

  paths[color] = [...keptPath];
  completed[color] = false;
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

function hasReachedCorrectEndpoint() {
  if (!currentColor || currentPath.length === 0) return false;

  const lastCell = currentPath[currentPath.length - 1];
  return isCorrectEndpoint(lastCell, currentColor);
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
  stopTimeModeTimer();
isTimeMode = false;

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

function hideSplashScreen() {
  const splash = document.getElementById("splash-screen");
  if (!splash) return;

  splash.classList.add("hidden");

  setTimeout(() => {
    splash.style.display = "none";
  }, 500);
}

function renderDifficultyButtons() {
  const container = document.getElementById("difficulty-buttons");
  if (!container) return;

  container.innerHTML = "";

  Object.keys(levelWorlds).forEach(difficulty => {
    const btn = document.createElement("button");
    btn.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    btn.addEventListener("click", () => {
      startDifficulty(difficulty);
    });

    container.appendChild(btn);
  });

  const timeBtn = document.createElement("button");
  timeBtn.textContent = "Time Mode";
  timeBtn.addEventListener("click", () => {
    startTimeMode();
  });
  container.appendChild(timeBtn);
}

function startDrawing(cell) {
  vibrate(10);

  const color = cell.dataset.color;
  if (!color) return;

  hideWinMessage();
  hideNextLevelButton();
  animateEndpoint(cell, false);

  const existingPath = paths[color] || [];
  const isCompleted = completed[color] === true;

  currentColor = color;
  isDrawing = true;

  // Fall 1: kein bestehender Pfad oder fertiger Pfad
  if (existingPath.length === 0) {
    if (cell.dataset.endpoint !== "true") {
      isDrawing = false;
      currentColor = null;
      return;
    }

    startEndpointCell = cell;
    clearPath(currentColor, true);
    currentPath = [cell];
    lastProcessedCell = cell;
    pendingPointerCell = cell;
    renderAllPaths();
    return;
  }

  // Fall 2: Klick auf bestehendem unfertigen Pfad
  const clickedIndex = existingPath.findIndex(pathCell =>
    isSameBoardCell(pathCell, cell)
  );

  if (clickedIndex !== -1) {
    const distanceToStart = clickedIndex;
    const distanceToEnd = existingPath.length - 1 - clickedIndex;

    let keptPath;

    if (distanceToStart <= distanceToEnd) {
      // näher am Anfang -> vorderen Teil behalten
      keptPath = existingPath.slice(0, clickedIndex + 1);
      startEndpointCell = keptPath[0];
      currentPath = [...keptPath];
    } else {
      // näher am Ende -> hinteren Teil behalten, aber umdrehen
      keptPath = existingPath.slice(clickedIndex).reverse();
      startEndpointCell = keptPath[0];
      currentPath = [...keptPath];
    }

    trimStoredPathToRange(color, currentPath, existingPath);

    lastProcessedCell = cell;
    pendingPointerCell = cell;
    renderAllPaths();
    return;
  }

  // Fall 3: auf Endpoint derselben Farbe, aber nicht auf aktuellem Pfad
  if (cell.dataset.endpoint === "true") {
  // nur resetten wenn KEIN bestehender Pfad oder komplett woanders
  const existingPath = paths[color] || [];

  const isPartOfPath = existingPath.some(p => isSameBoardCell(p, cell));

  if (!isPartOfPath) {
    startEndpointCell = cell;
    clearPath(currentColor, true);
    currentPath = [cell];
  } else {
    // wenn Teil des Pfads → NICHT löschen, einfach weiter
    startEndpointCell = existingPath[0];
    currentPath = [...existingPath];
  }

  lastProcessedCell = cell;
  pendingPointerCell = cell;
  renderAllPaths();
  return;
}

  isDrawing = false;
  currentColor = null;
}

function continueDrawingStep(cell) {
  if (!isDrawing || !currentColor) return false;

  // Wenn Ziel schon erreicht wurde, nichts mehr erweitern
  if (hasReachedCorrectEndpoint()) {
    return false;
  }

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

  // Falls wir jetzt den richtigen Endpunkt erreicht haben:
  // sofort nicht weiter erweitern
  if (hasReachedCorrectEndpoint()) {
    return false;
  }

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

  // Wenn schon korrekt verbunden, nichts mehr machen
  if (hasReachedCorrectEndpoint()) {
    renderAllPaths();
    return;
  }

  const cellsToTraverse = getInterpolatedCells(lastCell, cell);

  let changed = false;

  for (const nextCell of cellsToTraverse) {
    const success = continueDrawingStep(nextCell);

    if (
      currentPath.length > 0 &&
      hasReachedCorrectEndpoint()
    ) {
      changed = true;
      break;
    }

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

  let successStartCell = null;
  let successEndCell = null;

  if (isCorrectEndpoint(lastCell, drawnColor)) {
    successStartCell = startEndpointCell;
    successEndCell = lastCell;

    paths[drawnColor] = [...currentPath];
    completed[drawnColor] = true;

    paths[drawnColor].forEach(cell => {
      cell.dataset.locked = "true";
    });
  } else {
    paths[drawnColor] = [...currentPath];
    completed[drawnColor] = false;

    paths[drawnColor].forEach(cell => {
      if (cell.dataset.endpoint !== "true") {
        cell.dataset.color = drawnColor;
        delete cell.dataset.locked;
      }
    });
  }

  isDrawing = false;
  currentColor = null;
  currentPath = [];
  startEndpointCell = null;
  pendingPointerCell = null;
  lastProcessedCell = null;
  animationFrameScheduled = false;

  renderAllPaths();

  if (successStartCell && successEndCell) {
    requestAnimationFrame(() => {
      animateEndpoint(successStartCell, true);
      animateEndpoint(successEndCell, true);
    });
  }

  if (checkWin()) {
  if (isTimeMode) {
    timeModeSolvedCount += 1;
    updateTimeModeIndicator();

    setTimeout(() => {
      nextTimeModeLevel();
    }, 250);
  } else {
    showWinMessage();
    showNextLevelButton();
  }
}
}

function getCellFromPointerEvent(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element ? element.closest(".cell") : null;
}

function getCellFromPointerPosition(event) {
  const rect = board.getBoundingClientRect();
  const styles = getComputedStyle(board);
  const gap = parseFloat(styles.gap) || 0;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }

  const totalGapX = gap * (gridSize - 1);
  const totalGapY = gap * (gridSize - 1);

  const cellWidth = (rect.width - totalGapX) / gridSize;
  const cellHeight = (rect.height - totalGapY) / gridSize;

  const col = Math.floor(x / (cellWidth + gap));
  const row = Math.floor(y / (cellHeight + gap));

  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
    return null;
  }

  return getCell(row, col);
}

function processPendingPointerMove() {
  animationFrameScheduled = false;

  if (!isDrawing || !pendingPointerCell) return;

  if (pendingPointerCell === lastProcessedCell) return;

  lastProcessedCell = pendingPointerCell;
  continueDrawing(pendingPointerCell);
}

function addEventListeners() {
  board.onpointerdown = null;
  board.onpointermove = null;
  board.onpointerup = null;
  board.onpointerleave = null;
  board.onpointercancel = null;

  board.onpointerdown = (event) => {
    const cell = getCellFromPointerPosition(event) || event.target.closest(".cell");
    if (!cell) return;

    event.preventDefault();
    board.setPointerCapture?.(event.pointerId);
    startDrawing(cell);
  };

  board.onpointermove = (event) => {
    if (!isDrawing) return;

    event.preventDefault();

    const cell = getCellFromPointerPosition(event);
    if (!cell) return;

    pendingPointerCell = cell;

    if (!animationFrameScheduled) {
      animationFrameScheduled = true;
      requestAnimationFrame(processPendingPointerMove);
    }
  };

  board.onpointerup = (event) => {
    event.preventDefault();

    if (board.hasPointerCapture?.(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }

    stopDrawing();
  };

  board.onpointerleave = (event) => {
    if (!isDrawing) return;
    event.preventDefault();
  };

  board.onpointercancel = (event) => {
    event.preventDefault();

    if (board.hasPointerCapture?.(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }

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

  const sidePadding = 16;
const bottomSafety = 28;
const gap = 0; // muss zu deinem CSS passen

const viewportHeight = window.visualViewport
  ? window.visualViewport.height
  : window.innerHeight;

const boardTop = board.getBoundingClientRect().top;

const usableWidth = window.innerWidth - sidePadding * 2;
const usableHeight = viewportHeight - boardTop - bottomSafety;

const maxSize = Math.min(usableWidth, usableHeight);

const cellSize = Math.floor(
  (maxSize - gap * (gridSize - 1)) / gridSize
);

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
  if (!indicator) return;

  if (isTimeMode) {
    indicator.textContent = `TIME MODE – ${formatTimeMode(timeModeSecondsLeft)} – Gelöst: ${timeModeSolvedCount}`;
    return;
  }

  if (!currentDifficulty) return;

  indicator.textContent =
    `${currentDifficulty.toUpperCase()} – Level ${difficultyProgress[currentDifficulty] + 1}`;
}

function resetProgress() {
  difficultyProgress = {
    easy: 0,
    medium: 0,
    hard: 0
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
    easy.textContent = `Easy: Level ${difficultyProgress.easy + 1}`;
  }

  if (medium) {
    medium.textContent = `Medium: Level ${difficultyProgress.medium + 1}`;
  }

  if (hard) {
    hard.textContent = `Hard: Level ${difficultyProgress.hard + 1}`;
  }
}

function formatTimeMode(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function updateTimeModeIndicator() {
  const indicator = document.getElementById("level-indicator");
  if (!indicator) return;

  if (isTimeMode) {
    indicator.textContent = `TIME MODE – ${formatTimeMode(timeModeSecondsLeft)} – Gelöst: ${timeModeSolvedCount}`;
  } else if (currentDifficulty) {
    indicator.textContent =
      `${currentDifficulty.toUpperCase()} – Level ${difficultyProgress[currentDifficulty] + 1}`;
  }
}

function stopTimeModeTimer() {
  if (timeModeTimerId) {
    clearInterval(timeModeTimerId);
    timeModeTimerId = null;
  }
}

function endTimeMode() {
  stopTimeModeTimer();
  isTimeMode = false;
  currentDifficulty = null;

  alert(`Zeit abgelaufen! Du hast ${timeModeSolvedCount} Level geschafft.`);

  showMenu();
  updateTimeModeIndicator();
}

function startTimeModeTimer() {
  stopTimeModeTimer();

  timeModeTimerId = setInterval(() => {
    timeModeSecondsLeft -= 1;
    updateTimeModeIndicator();

    if (timeModeSecondsLeft <= 0) {
      endTimeMode();
    }
  }, 1000);
}

function getRandomEasyLevel() {
  const levels = levelWorlds.easy;

  if (!levels || levels.length === 0) {
    throw new Error("Keine Easy-Level für Time Mode verfügbar.");
  }

  return levels[Math.floor(Math.random() * levels.length)];
}

function startTimeMode() {
  isTimeMode = true;
  currentDifficulty = null;
  timeModeSecondsLeft = 120;
  timeModeSolvedCount = 0;

  pendingPointerCell = null;
  lastProcessedCell = null;
  animationFrameScheduled = false;
  isDrawing = false;
  currentColor = null;
  currentPath = [];
  startEndpointCell = null;

  try {
    currentLevel = getRandomEasyLevel();
    loadGeneratedLevel(currentLevel);
    showGame();
    updateTimeModeIndicator();
    startTimeModeTimer();
  } catch (error) {
    alert("Time Mode konnte nicht gestartet werden.");
  }
}

function nextTimeModeLevel() {
  if (!isTimeMode) return;

  pendingPointerCell = null;
  lastProcessedCell = null;
  animationFrameScheduled = false;
  isDrawing = false;
  currentColor = null;
  currentPath = [];
  startEndpointCell = null;

  try {
    currentLevel = getRandomEasyLevel();
    loadGeneratedLevel(currentLevel);
    updateTimeModeIndicator();
  } catch (error) {
    endTimeMode();
  }
}

const resetProgressBtn = document.getElementById("reset-progress-btn");

if (resetProgressBtn) {
  resetProgressBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    resetProgress();
    alert("Fortschritt zurückgesetzt.");
  });
}

const nextLevelBtn = document.getElementById("next-level-btn");
if (nextLevelBtn) {
  nextLevelBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    nextGeneratedLevel();
  });
}

const resetBtn = document.getElementById("reset-btn");
if (resetBtn) {
  resetBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    resetCurrentLevel();
  });
}

const backBtn = document.getElementById("back-to-menu-btn");
if (backBtn) {
  backBtn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    showMenu();
  });
}
loadProgress();
renderDifficultyButtons();
updateScoreboard();
showMenu();

window.addEventListener("load", () => {
  setTimeout(() => {
    hideSplashScreen();
  }, 700);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.log("Service Worker registriert.");
      })
      .catch(error => {
        console.error("Service Worker Fehler:", error);
      });
  });
}
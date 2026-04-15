function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function transformCell(cell, size, transform) {
  const [r, c] = cell;

  switch (transform) {
    case "identity":
      return [r, c];
    case "flipH":
      return [r, size - 1 - c];
    case "flipV":
      return [size - 1 - r, c];
    case "rotate180":
      return [size - 1 - r, size - 1 - c];
    case "rotate90":
      return [c, size - 1 - r];
    case "rotate270":
      return [size - 1 - c, r];
    default:
      return [r, c];
  }
}

function transformLevel(level, transform, newId) {
  return {
    id: newId,
    size: level.size,
    pairs: level.pairs.map(pair => ({
      color: pair.color,
      start: transformCell(pair.start, level.size, transform),
      end: transformCell(pair.end, level.size, transform)
    }))
  };
}

function remapColors(level, newId) {
  const colors = [...new Set(level.pairs.map(pair => pair.color))];
  const shuffled = shuffleArray(colors);

  const colorMap = {};
  for (let i = 0; i < colors.length; i++) {
    colorMap[colors[i]] = shuffled[i];
  }

  return {
    id: newId,
    size: level.size,
    pairs: level.pairs.map(pair => ({
      color: colorMap[pair.color],
      start: [...pair.start],
      end: [...pair.end]
    }))
  };
}

function normalizePair(pair) {
  const aKey = `${pair.start[0]},${pair.start[1]}`;
  const bKey = `${pair.end[0]},${pair.end[1]}`;

  if (aKey <= bKey) {
    return {
      color: pair.color,
      start: pair.start,
      end: pair.end
    };
  }

  return {
    color: pair.color,
    start: pair.end,
    end: pair.start
  };
}

function levelSignature(level) {
  const normalizedPairs = level.pairs
    .map(normalizePair)
    .map(pair => `${pair.color}:${pair.start[0]},${pair.start[1]}-${pair.end[0]},${pair.end[1]}`)
    .sort();

  return `${level.size}|${normalizedPairs.join("|")}`;
}

function buildVariantsFromSeeds(seedLevels, prefix) {
  const transforms = [
    "identity",
    "flipH",
    "flipV",
    "rotate180",
    "rotate90",
    "rotate270"
  ];

  const globalSeen = new Set();
  const variantBuckets = [];
  let counter = 1;

  // 1. Für jedes Seed-Level eigenen Varianten-Bucket bauen
  for (const seed of seedLevels) {
    const localVariants = [];

    for (const transform of transforms) {
      const transformed = transformLevel(
        seed,
        transform,
        `${prefix}-${String(counter).padStart(3, "0")}`
      );

      const sig1 = levelSignature(transformed);
      if (!globalSeen.has(sig1)) {
        globalSeen.add(sig1);
        localVariants.push(transformed);
        counter++;
      }

      const recolored = remapColors(
        transformed,
        `${prefix}-${String(counter).padStart(3, "0")}`
      );

      const sig2 = levelSignature(recolored);
      if (!globalSeen.has(sig2)) {
        globalSeen.add(sig2);
        localVariants.push(recolored);
        counter++;
      }
    }

    if (localVariants.length > 0) {
      variantBuckets.push(shuffleArray(localVariants));
    }
  }

  // 2. Auch die Reihenfolge der Grund-Level mischen
  const shuffledBuckets = shuffleArray(variantBuckets);

  // 3. Rundeweise je eine Variante aus jedem Bucket ziehen
  const result = [];
  let addedSomething = true;

  while (addedSomething) {
    addedSomething = false;

    for (const bucket of shuffledBuckets) {
      if (bucket.length > 0) {
        result.push(bucket.shift());
        addedSomething = true;
      }
    }
  }

  // 4. IDs neu sauber durchnummerieren
  return result.map((level, index) => ({
    ...level,
    id: `${prefix}-${String(index + 1).padStart(3, "0")}`
  }));
}

const levelWorlds = {
  easy: buildVariantsFromSeeds(levelSeeds.easy || [], "easy"),
  medium: buildVariantsFromSeeds(levelSeeds.medium || [], "medium"),
  hard: buildVariantsFromSeeds(levelSeeds.hard || [], "hard")
};
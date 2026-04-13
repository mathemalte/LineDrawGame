const levelSeeds = {
  easy: [
  {
    id: "easy-seed-001",
    size: 6,
    pairs: [
      { color: "orange", start: [1, 1], end: [2, 4] },
      { color: "green",  start: [1, 2], end: [1, 4] },
      { color: "cyan",   start: [1, 5], end: [2, 0] },
      { color: "blue",   start: [2, 5], end: [3, 0] },
      { color: "red",    start: [3, 1], end: [3, 3] },
      { color: "yellow", start: [3, 4], end: [4, 1] }
    ]
  },

  {
    id: "easy-seed-002",
    size: 6,
    pairs: [
      { color: "green",  start: [0, 1], end: [5, 0] },
      { color: "orange", start: [1, 1], end: [5, 1] },
      { color: "yellow", start: [1, 3], end: [4, 5] },
      { color: "blue",   start: [1, 4], end: [3, 5] },
      { color: "red",    start: [2, 5], end: [5, 5] }
    ]
  },

  {
    id: "easy-seed-003",
    size: 7,
    pairs: [
      { color: "yellow", start: [0, 4], end: [2, 5] },
      { color: "red",    start: [0, 5], end: [3, 5] },
      { color: "orange", start: [1, 1], end: [4, 4] },
      { color: "cyan",   start: [1, 2], end: [3, 3] },
      { color: "green",  start: [3, 4], end: [5, 6] },
      { color: "blue",   start: [4, 6], end: [5, 1] }
    ]
  },

  {
    id: "easy-seed-004",
    size: 8,
    pairs: [
      { color: "pink",   start: [0, 5], end: [7, 3] },
      { color: "orange", start: [1, 3], end: [2, 1] },
      { color: "yellow", start: [2, 0], end: [3, 6] },
      { color: "brown",  start: [2, 2], end: [3, 5] },
      { color: "cyan",   start: [3, 0], end: [5, 2] },
      { color: "green",  start: [3, 1], end: [6, 1] },
      { color: "blue",   start: [3, 2], end: [6, 3] },
      { color: "red",    start: [4, 2], end: [5, 5] }
    ]
  },

  {
    id: "easy-seed-005",
    size: 8,
    pairs: [
      { color: "brown",  start: [0, 4], end: [1, 6] },
      { color: "green",  start: [0, 5], end: [2, 5] },
      { color: "red",    start: [1, 1], end: [5, 2] },
      { color: "cyan",   start: [1, 2], end: [4, 3] },
      { color: "pink",   start: [3, 5], end: [3, 7] },
      { color: "orange", start: [5, 1], end: [7, 5] },
      { color: "blue",   start: [5, 6], end: [6, 1] },
      { color: "yellow", start: [6, 0], end: [6, 6] }
    ]
  },

  {
    id: "easy-seed-006",
    size: 7,
    pairs: [
      { color: "green",  start: [1, 2], end: [3, 3] },
      { color: "blue",   start: [1, 5], end: [2, 2] },
      { color: "cyan",   start: [2, 4], end: [5, 0] },
      { color: "yellow", start: [3, 0], end: [5, 5] },
      { color: "red",    start: [3, 6], end: [6, 2] },
      { color: "orange", start: [5, 4], end: [6, 0] }
    ]
  },

  {
    id: "easy-seed-007",
    size: 7,
    pairs: [
      { color: "green",  start: [0, 1], end: [5, 5] },
      { color: "blue",   start: [0, 5], end: [5, 4] },
      { color: "cyan",   start: [0, 6], end: [6, 6] },
      { color: "yellow", start: [1, 3], end: [2, 2] },
      { color: "orange", start: [1, 5], end: [3, 2] },
      { color: "red",    start: [2, 5], end: [4, 2] }
    ]
  }
],

  medium: [
    // deine medium level hier
  ],

  hard: [
    {
      id: "imported-hard-001",
      size: 12,
      pairs: [
        { color: "green",  start: [0, 8],  end: [9, 7] },
        { color: "red",    start: [1, 9],  end: [11, 10] },
        { color: "pink",   start: [1, 10], end: [11, 0] },
        { color: "blue",   start: [2, 2],  end: [8, 5] },
        { color: "orange", start: [3, 6],  end: [11, 11] },
        { color: "cyan",   start: [4, 9],  end: [9, 11] },
        { color: "yellow", start: [7, 5],  end: [8, 7] }
      ]
    },

    {
      id: "imported-hard-002",
      size: 12,
      pairs: [
        { color: "pink",   start: [1, 7],  end: [10, 5] },
        { color: "orange", start: [1, 10], end: [10, 7] },
        { color: "yellow", start: [2, 7],  end: [10, 6] },
        { color: "green",  start: [2, 8],  end: [11, 5] },
        { color: "blue",   start: [6, 6],  end: [10, 11] },
        { color: "cyan",   start: [7, 5],  end: [8, 10] },
        { color: "red",    start: [7, 6],  end: [11, 6] },
        { color: "brown",  start: [8, 3],  end: [10, 10] }
      ]
    },

    {
      id: "imported-hard-003",
      size: 12,
      pairs: [
        { color: "orange", start: [0, 3],  end: [5, 6] },
        { color: "green",  start: [0, 4],  end: [4, 1] },
        { color: "red",    start: [0, 6],  end: [9, 5] },
        { color: "pink",   start: [1, 1],  end: [9, 2] },
        { color: "yellow", start: [1, 8],  end: [8, 6] },
        { color: "cyan",   start: [1, 10], end: [6, 6] },
        { color: "blue",   start: [2, 8],  end: [11, 10] }
      ]
    },

    {
      id: "imported-hard-004",
      size: 12,
      pairs: [
        { color: "blue",   start: [0, 11], end: [5, 6] },
        { color: "red",    start: [1, 1],  end: [3, 9] },
        { color: "yellow", start: [1, 5],  end: [9, 6] },
        { color: "cyan",   start: [1, 8],  end: [11, 9] },
        { color: "brown",  start: [3, 5],  end: [7, 7] },
        { color: "green",  start: [3, 6],  end: [10, 7] },
        { color: "orange", start: [5, 8],  end: [10, 10] },
        { color: "pink",   start: [8, 7],  end: [11, 5] }
      ]
    },

    {
      id: "imported-hard-005",
      size: 12,
      pairs: [
        { color: "yellow", start: [0, 11], end: [8, 6] },
        { color: "blue",   start: [1, 5],  end: [5, 1] },
        { color: "brown",  start: [2, 5],  end: [8, 8] },
        { color: "green",  start: [2, 7],  end: [10, 7] },
        { color: "red",    start: [3, 3],  end: [11, 6] },
        { color: "pink",   start: [6, 6],  end: [10, 1] },
        { color: "orange", start: [7, 6],  end: [10, 2] },
        { color: "cyan",   start: [10, 3], end: [11, 7] }
      ]
    },

    {
      id: "imported-hard-006",
      size: 12,
      pairs: [
        { color: "orange", start: [0, 8],  end: [9, 4] },
        { color: "pink",   start: [0, 11], end: [4, 10] },
        { color: "purple", start: [1, 8],  end: [7, 4] },
        { color: "cyan",   start: [1, 10], end: [8, 3] },
        { color: "red",    start: [2, 0],  end: [2, 6] },
        { color: "brown",  start: [2, 4],  end: [10, 11] },
        { color: "green",  start: [2, 5],  end: [11, 11] },
        { color: "yellow", start: [6, 9],  end: [7, 3] },
        { color: "blue",   start: [6, 6],  end: [8, 10] }
      ]
    },

    {
      id: "imported-hard-007",
      size: 12,
      pairs: [
        { color: "blue",   start: [2, 5],  end: [8, 6] },
        { color: "brown",  start: [3, 3],  end: [9, 4] },
        { color: "pink",   start: [3, 8],  end: [5, 5] },
        { color: "purple", start: [5, 9],  end: [11, 8] },
        { color: "red",    start: [5, 4],  end: [6, 2] },
        { color: "green",  start: [7, 4],  end: [10, 9] },
        { color: "yellow", start: [7, 9],  end: [11, 1] },
        { color: "orange", start: [8, 4],  end: [9, 6] },
        { color: "cyan",   start: [10, 1], end: [11, 11] }
      ]
    },

    {
      id: "imported-hard-008",
      size: 12,
      pairs: [
        { color: "red",    start: [0, 0],  end: [6, 6] },
        { color: "cyan",   start: [2, 8],  end: [9, 7] },
        { color: "blue",   start: [4, 5],  end: [9, 5] },
        { color: "pink",   start: [4, 7],  end: [10, 1] },
        { color: "orange", start: [5, 1],  end: [9, 3] },
        { color: "green",  start: [5, 2],  end: [9, 4] },
        { color: "yellow", start: [6, 1],  end: [8, 7] }
      ]
    },

    {
      id: "imported-hard-009",
      size: 12,
      pairs: [
        { color: "orange", start: [1, 1],  end: [11, 5] },
        { color: "red",    start: [3, 2],  end: [11, 2] },
        { color: "green",  start: [3, 9],  end: [11, 11] },
        { color: "yellow", start: [4, 1],  end: [11, 3] },
        { color: "cyan",   start: [5, 6],  end: [9, 2] },
        { color: "pink",   start: [6, 7],  end: [7, 3] },
        { color: "blue",   start: [7, 7],  end: [10, 2] },
        { color: "brown",  start: [9, 4],  end: [10, 1] }
      ]
    },

    {
      id: "imported-hard-010",
      size: 12,
      pairs: [
        { color: "blue",   start: [2, 9],  end: [7, 10] },
        { color: "cyan",   start: [3, 8],  end: [9, 4] },
        { color: "orange", start: [4, 8],  end: [10, 10] },
        { color: "yellow", start: [5, 5],  end: [11, 5] },
        { color: "green",  start: [6, 8],  end: [9, 11] },
        { color: "red",    start: [5, 10], end: [10, 11] }
      ]
    }
  ]
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PuzzleState = readonly number[]; // Exactly 9 numbers (0-8), where 0 is blank

export type Move = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface MoveStep {
  state: PuzzleState;
  move: Move | 'INITIAL';
  tileMoved: number; // 0 for initial
  g: number; // path cost
  h: number; // heuristic cost
  f: number; // total evaluated cost (g + h)
}

export interface TileDiagnostic {
  tile: number;
  currentPos: { row: number; col: number; index: number };
  goalPos: { row: number; col: number; index: number };
  dx: number;
  dy: number;
  manhattan: number;
  isMisplaced: boolean;
  hasLinearConflict: boolean;
}

export const GOAL_STANDARD: PuzzleState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
export const GOAL_CENTER_BLANK: PuzzleState = [1, 2, 3, 8, 0, 4, 7, 6, 5];

export interface PuzzlePreset {
  id: string;
  name: string;
  difficulty: 'Trivial' | 'Easy' | 'Medium' | 'Hard' | 'Extreme' | 'Unsolvable';
  optimalMoves: number | string;
  state: PuzzleState;
  description: string;
}

export const PRESETS: PuzzlePreset[] = [
  {
    id: 'trivial_2',
    name: '2-Move Warmup',
    difficulty: 'Trivial',
    optimalMoves: 2,
    state: [1, 2, 3, 4, 5, 6, 7, 0, 8],
    description: 'Requires sliding 8 then blank into place.',
  },
  {
    id: 'easy_4',
    name: '4-Move Corner Shift',
    difficulty: 'Easy',
    optimalMoves: 4,
    state: [1, 2, 3, 4, 0, 6, 7, 5, 8],
    description: 'Quick central scramble requiring 4 moves.',
  },
  {
    id: 'easy_6',
    name: '6-Move Step-Ladder',
    difficulty: 'Easy',
    optimalMoves: 6,
    state: [1, 2, 3, 0, 4, 6, 7, 5, 8],
    description: 'Short sequence demonstrating BFS and A* efficiency.',
  },
  {
    id: 'medium_12',
    name: '12-Move Classic Mix',
    difficulty: 'Medium',
    optimalMoves: 12,
    state: [1, 2, 3, 5, 0, 6, 4, 7, 8],
    description: 'Noticeable difference between Manhattan and Misplaced heuristics.',
  },
  {
    id: 'medium_14',
    name: '14-Move Perimeter Loop',
    difficulty: 'Medium',
    optimalMoves: 14,
    state: [2, 8, 3, 1, 6, 4, 7, 0, 5],
    description: 'Shows where DFS may struggle without depth bounding.',
  },
  {
    id: 'hard_20',
    name: '20-Move Double Ring',
    difficulty: 'Hard',
    optimalMoves: 20,
    state: [7, 2, 4, 5, 0, 6, 8, 3, 1],
    description: 'Complex tile interleaving. Linear Conflict heuristic shines here.',
  },
  {
    id: 'hard_24',
    name: '24-Move Master Configuration',
    difficulty: 'Hard',
    optimalMoves: 24,
    state: [8, 1, 2, 0, 4, 3, 7, 6, 5],
    description: 'Demonstrates BFS memory explosion vs A* pruning.',
  },
  {
    id: 'extreme_31',
    name: '31-Move Maximum Depth (Hardest)',
    difficulty: 'Extreme',
    optimalMoves: 31,
    state: [8, 6, 7, 2, 5, 4, 3, 0, 1],
    description: 'Known theoretical maximum diameter (God\'s Number for 8-Puzzle = 31).',
  },
  {
    id: 'unsolvable_demo',
    name: 'Unsolvable Demo (Odd Inversions)',
    difficulty: 'Unsolvable',
    optimalMoves: 'None',
    state: [1, 2, 3, 4, 5, 6, 8, 7, 0],
    description: 'Only tiles 7 and 8 are swapped. Inversion count is 1 (odd), making it mathematically unreachable.',
  },
];

/**
 * Checks if two states are identical
 */
export function areStatesEqual(a: PuzzleState, b: PuzzleState): boolean {
  for (let i = 0; i < 9; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * State to unique numeric or string key for Visited Sets / Hash Maps
 */
export function stateToKey(state: PuzzleState): string {
  return state.join(',');
}

/**
 * Get coordinates (row, col) from 0-based 1D index
 */
export function indexToCoord(idx: number): { row: number; col: number } {
  return { row: Math.floor(idx / 3), col: idx % 3 };
}

/**
 * Get 1D index from coordinates (row, col)
 */
export function coordToIndex(row: number, col: number): number {
  return row * 3 + col;
}

/**
 * Get blank index (tile 0)
 */
export function getBlankIndex(state: PuzzleState): number {
  return state.indexOf(0);
}

/**
 * Get possible moves and resulting states from a given puzzle state
 */
export function getNeighbors(state: PuzzleState): Array<{
  state: PuzzleState;
  move: Move;
  tileMoved: number;
}> {
  const blankIdx = getBlankIndex(state);
  const { row, col } = indexToCoord(blankIdx);
  const neighbors: Array<{ state: PuzzleState; move: Move; tileMoved: number }> = [];

  // Moving blank UP means tile above blank slides DOWN into blank
  if (row > 0) {
    const swapIdx = coordToIndex(row - 1, col);
    const nextState = [...state];
    nextState[blankIdx] = nextState[swapIdx];
    nextState[swapIdx] = 0;
    neighbors.push({
      state: nextState,
      move: 'UP',
      tileMoved: state[swapIdx],
    });
  }

  // Moving blank DOWN means tile below blank slides UP into blank
  if (row < 2) {
    const swapIdx = coordToIndex(row + 1, col);
    const nextState = [...state];
    nextState[blankIdx] = nextState[swapIdx];
    nextState[swapIdx] = 0;
    neighbors.push({
      state: nextState,
      move: 'DOWN',
      tileMoved: state[swapIdx],
    });
  }

  // Moving blank LEFT means tile to the left slides RIGHT into blank
  if (col > 0) {
    const swapIdx = coordToIndex(row, col - 1);
    const nextState = [...state];
    nextState[blankIdx] = nextState[swapIdx];
    nextState[swapIdx] = 0;
    neighbors.push({
      state: nextState,
      move: 'LEFT',
      tileMoved: state[swapIdx],
    });
  }

  // Moving blank RIGHT means tile to the right slides LEFT into blank
  if (col < 2) {
    const swapIdx = coordToIndex(row, col + 1);
    const nextState = [...state];
    nextState[blankIdx] = nextState[swapIdx];
    nextState[swapIdx] = 0;
    neighbors.push({
      state: nextState,
      move: 'RIGHT',
      tileMoved: state[swapIdx],
    });
  }

  return neighbors;
}

/**
 * Inversions count: A pair (i, j) where i < j, state[i] > state[j], and neither is 0.
 */
export function getInversionPairs(state: PuzzleState): Array<[number, number]> {
  const nonBlank = state.filter((val) => val !== 0);
  const pairs: Array<[number, number]> = [];

  for (let i = 0; i < nonBlank.length; i++) {
    for (let j = i + 1; j < nonBlank.length; j++) {
      if (nonBlank[i] > nonBlank[j]) {
        pairs.push([nonBlank[i], nonBlank[j]]);
      }
    }
  }

  return pairs;
}

export function countInversions(state: PuzzleState): number {
  return getInversionPairs(state).length;
}

/**
 * For standard 3x3 puzzle with odd grid width (N=3),
 * a state is solvable if and only if the number of inversions has the same parity
 * as the goal state. For standard goal (1..8, 0), inversions = 0 (even),
 * so state must have an EVEN number of inversions.
 */
export function isSolvable(state: PuzzleState, goal: PuzzleState = GOAL_STANDARD): boolean {
  const stateInversions = countInversions(state);
  const goalInversions = countInversions(goal);
  return stateInversions % 2 === goalInversions % 2;
}

/**
 * HEURISTIC 1: Misplaced Tiles (Hamming Distance)
 * Number of non-blank tiles that are not in their target goal positions.
 * Admissible: Every misplaced tile must be moved at least once.
 */
export function misplacedTiles(state: PuzzleState, goal: PuzzleState = GOAL_STANDARD): number {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] !== 0 && state[i] !== goal[i]) {
      count++;
    }
  }
  return count;
}

/**
 * Precompute goal positions for fast lookups
 */
export function buildGoalMap(goal: PuzzleState = GOAL_STANDARD): Map<number, { row: number; col: number; index: number }> {
  const map = new Map<number, { row: number; col: number; index: number }>();
  for (let i = 0; i < 9; i++) {
    map.set(goal[i], {
      row: Math.floor(i / 3),
      col: i % 3,
      index: i,
    });
  }
  return map;
}

/**
 * HEURISTIC 2: Manhattan Distance (Taxicab / L1 Metric)
 * Sum of the horizontal and vertical distances of tiles from their goal positions.
 * Admissible and consistent.
 */
export function manhattanDistance(
  state: PuzzleState,
  goal: PuzzleState = GOAL_STANDARD,
  goalMap?: Map<number, { row: number; col: number; index: number }>
): number {
  const gMap = goalMap ?? buildGoalMap(goal);
  let distance = 0;

  for (let i = 0; i < 9; i++) {
    const tile = state[i];
    if (tile !== 0) {
      const current = indexToCoord(i);
      const target = gMap.get(tile)!;
      distance += Math.abs(current.row - target.row) + Math.abs(current.col - target.col);
    }
  }

  return distance;
}

/**
 * HEURISTIC 3: Linear Conflict
 * Manhattan distance + 2 * (linear conflicts).
 * A linear conflict occurs when two tiles tj and tk are in the same line (row or column),
 * their goal positions are also in that line, but tj is to the right/below tk while in
 * the goal tj is to the left/above tk.
 * They must detour past each other, requiring at least 2 extra moves.
 * Admissible and dominates Manhattan distance!
 */
export function linearConflict(
  state: PuzzleState,
  goal: PuzzleState = GOAL_STANDARD,
  goalMap?: Map<number, { row: number; col: number; index: number }>
): number {
  const gMap = goalMap ?? buildGoalMap(goal);
  let conflictMoves = 0;
  const manhattan = manhattanDistance(state, goal, gMap);

  // Check row conflicts
  for (let r = 0; r < 3; r++) {
    const rowTiles: Array<{ tile: number; col: number; targetCol: number }> = [];
    for (let c = 0; c < 3; c++) {
      const tile = state[coordToIndex(r, c)];
      if (tile !== 0) {
        const target = gMap.get(tile)!;
        if (target.row === r) {
          rowTiles.push({ tile, col: c, targetCol: target.col });
        }
      }
    }
    for (let i = 0; i < rowTiles.length; i++) {
      for (let j = i + 1; j < rowTiles.length; j++) {
        const ti = rowTiles[i];
        const tj = rowTiles[j];
        if (ti.col < tj.col && ti.targetCol > tj.targetCol) {
          conflictMoves += 2;
        }
      }
    }
  }

  // Check column conflicts
  for (let c = 0; c < 3; c++) {
    const colTiles: Array<{ tile: number; row: number; targetRow: number }> = [];
    for (let r = 0; r < 3; r++) {
      const tile = state[coordToIndex(r, c)];
      if (tile !== 0) {
        const target = gMap.get(tile)!;
        if (target.col === c) {
          colTiles.push({ tile, row: r, targetRow: target.row });
        }
      }
    }
    for (let i = 0; i < colTiles.length; i++) {
      for (let j = i + 1; j < colTiles.length; j++) {
        const ti = colTiles[i];
        const tj = colTiles[j];
        if (ti.row < tj.row && ti.targetRow > tj.targetRow) {
          conflictMoves += 2;
        }
      }
    }
  }

  return manhattan + conflictMoves;
}

/**
 * Detailed Diagnostic for all 8 tiles
 */
export function getDetailedHeuristics(
  state: PuzzleState,
  goal: PuzzleState = GOAL_STANDARD
): TileDiagnostic[] {
  const gMap = buildGoalMap(goal);
  const diagnostics: TileDiagnostic[] = [];

  // Identify linear conflict tiles
  const conflictTiles = new Set<number>();
  // Row conflicts
  for (let r = 0; r < 3; r++) {
    const rowTiles: Array<{ tile: number; col: number; targetCol: number }> = [];
    for (let c = 0; c < 3; c++) {
      const tile = state[coordToIndex(r, c)];
      if (tile !== 0) {
        const target = gMap.get(tile)!;
        if (target.row === r) rowTiles.push({ tile, col: c, targetCol: target.col });
      }
    }
    for (let i = 0; i < rowTiles.length; i++) {
      for (let j = i + 1; j < rowTiles.length; j++) {
        if (rowTiles[i].col < rowTiles[j].col && rowTiles[i].targetCol > rowTiles[j].targetCol) {
          conflictTiles.add(rowTiles[i].tile);
          conflictTiles.add(rowTiles[j].tile);
        }
      }
    }
  }
  // Col conflicts
  for (let c = 0; c < 3; c++) {
    const colTiles: Array<{ tile: number; row: number; targetRow: number }> = [];
    for (let r = 0; r < 3; r++) {
      const tile = state[coordToIndex(r, c)];
      if (tile !== 0) {
        const target = gMap.get(tile)!;
        if (target.col === c) colTiles.push({ tile, row: r, targetRow: target.row });
      }
    }
    for (let i = 0; i < colTiles.length; i++) {
      for (let j = i + 1; j < colTiles.length; j++) {
        if (colTiles[i].row < colTiles[j].row && colTiles[i].targetRow > colTiles[j].targetRow) {
          conflictTiles.add(colTiles[i].tile);
          conflictTiles.add(colTiles[j].tile);
        }
      }
    }
  }

  for (let tile = 1; tile <= 8; tile++) {
    const currentIdx = state.indexOf(tile);
    const current = indexToCoord(currentIdx);
    const target = gMap.get(tile)!;
    const dx = target.col - current.col;
    const dy = target.row - current.row;
    const manhattan = Math.abs(dx) + Math.abs(dy);

    diagnostics.push({
      tile,
      currentPos: { ...current, index: currentIdx },
      goalPos: target,
      dx,
      dy,
      manhattan,
      isMisplaced: manhattan > 0,
      hasLinearConflict: conflictTiles.has(tile),
    });
  }

  return diagnostics;
}

/**
 * Generate a random solvable puzzle configuration by performing random valid moves from goal
 * or checking solvability of a random permutation.
 */
export function generateRandomSolvable(
  goal: PuzzleState = GOAL_STANDARD,
  shuffleMoves: number = 40
): PuzzleState {
  let current: PuzzleState = [...goal];
  let lastBlank = getBlankIndex(current);

  for (let i = 0; i < shuffleMoves; i++) {
    const neighbors = getNeighbors(current);
    // Prefer moves that don't immediately undo the previous one
    const valid = neighbors.filter((n) => getBlankIndex(n.state) !== lastBlank);
    const chosen = (valid.length > 0 ? valid : neighbors)[
      Math.floor(Math.random() * (valid.length > 0 ? valid.length : neighbors.length))
    ];
    lastBlank = getBlankIndex(current);
    current = chosen.state;
  }

  // Ensure it's not already solved
  if (areStatesEqual(current, goal)) {
    const neighbors = getNeighbors(current);
    return neighbors[0].state;
  }

  return current;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PuzzleState,
  Move,
  MoveStep,
  GOAL_STANDARD,
  areStatesEqual,
  stateToKey,
  getNeighbors,
  manhattanDistance,
  misplacedTiles,
  linearConflict,
  buildGoalMap,
} from './puzzle';

export type AlgorithmCategory = 'uninformed' | 'heuristic';

export type AlgorithmId =
  | 'astar_manhattan'
  | 'astar_linear_conflict'
  | 'astar_misplaced'
  | 'greedy_best_first'
  | 'ida_star'
  | 'bfs'
  | 'ids'
  | 'ucs'
  | 'dfs';

export interface AlgorithmMetadata {
  id: AlgorithmId;
  name: string;
  category: AlgorithmCategory;
  heuristicName?: string;
  isOptimal: boolean;
  isComplete: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  description: string;
}

export const ALGORITHMS: Record<AlgorithmId, AlgorithmMetadata> = {
  astar_linear_conflict: {
    id: 'astar_linear_conflict',
    name: 'A* Search (Linear Conflict)',
    category: 'heuristic',
    heuristicName: 'h(n) = Manhattan + 2 × Linear Conflicts',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    description: 'Most powerful admissible heuristic. Dominates standard Manhattan by adding 2 steps for each pair of tiles that must cross paths.',
  },
  astar_manhattan: {
    id: 'astar_manhattan',
    name: 'A* Search (Manhattan Distance)',
    category: 'heuristic',
    heuristicName: 'h(n) = Taxicab / L1 Metric',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    description: 'Gold standard heuristic. Admissible and consistent. Evaluates f(n) = g(n) + h(n), guaranteeing the minimum move count.',
  },
  astar_misplaced: {
    id: 'astar_misplaced',
    name: 'A* Search (Misplaced Tiles)',
    category: 'heuristic',
    heuristicName: 'h(n) = Hamming / Misplaced count',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    description: 'Admissible heuristic counting tiles out of place. Weaker than Manhattan, so it typically expands more nodes.',
  },
  greedy_best_first: {
    id: 'greedy_best_first',
    name: 'Greedy Best-First Search',
    category: 'heuristic',
    heuristicName: 'f(n) = h(n) [Manhattan]',
    isOptimal: false,
    isComplete: true,
    timeComplexity: 'O(b^m)',
    spaceComplexity: 'O(b^m)',
    description: 'Aggressively expands the node estimated closest to the goal. Extremely fast, but not guaranteed to find the shortest path.',
  },
  ida_star: {
    id: 'ida_star',
    name: 'IDA* (Iterative Deepening A*)',
    category: 'heuristic',
    heuristicName: 'f-bound with Manhattan',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(d)',
    description: 'Combines heuristic guidance with DFS minimal memory footprint. Searches with increasing f-cost thresholds.',
  },
  bfs: {
    id: 'bfs',
    name: 'Breadth-First Search (BFS)',
    category: 'uninformed',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    description: 'Expands the shallowest unexpanded node using a FIFO queue. Finds the shortest path, but consumes exponential memory.',
  },
  ids: {
    id: 'ids',
    name: 'Iterative Deepening Search (IDS)',
    category: 'uninformed',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(bd)',
    description: 'Combines BFS optimality with DFS linear space complexity by progressively increasing the depth cutoff.',
  },
  ucs: {
    id: 'ucs',
    name: 'Uniform Cost Search (UCS)',
    category: 'uninformed',
    isOptimal: true,
    isComplete: true,
    timeComplexity: 'O(b^(C*/ε))',
    spaceComplexity: 'O(b^(C*/ε))',
    description: 'Dijkstra-equivalent uninformed search. Expands nodes in order of path cost g(n). Equivalent to BFS when step cost = 1.',
  },
  dfs: {
    id: 'dfs',
    name: 'Depth-First Search (DFS)',
    category: 'uninformed',
    isOptimal: false,
    isComplete: false,
    timeComplexity: 'O(b^m)',
    spaceComplexity: 'O(bm)',
    description: 'Expands the deepest node using a LIFO stack. Highly suboptimal and susceptible to long loops without depth bounding.',
  },
};

export interface SearchTreeNode {
  id: string;
  state: PuzzleState;
  move: Move | 'ROOT';
  tileMoved: number;
  g: number;
  h: number;
  f: number;
  depth: number;
  parentId?: string;
  isSolutionNode?: boolean;
}

export interface SolverResult {
  success: boolean;
  algorithmId: AlgorithmId;
  algorithmName: string;
  solution: MoveStep[];
  nodesExpanded: number;
  nodesGenerated: number;
  maxFrontierSize: number;
  executionTimeMs: number;
  pathLength: number;
  isOptimal: boolean;
  searchTreeSample: SearchTreeNode[];
  errorReason?: string;
}

export interface SolverOptions {
  maxNodes?: number;
  timeoutMs?: number;
  dfsDepthLimit?: number;
}

// ----------------- Fast Binary Min-Heap Priority Queue -----------------
interface HeapItem<T> {
  priority: number;
  secondaryPriority?: number; // tie-breaker (e.g. smaller h or larger g)
  item: T;
}

class MinPriorityQueue<T> {
  private heap: HeapItem<T>[] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(item: T, priority: number, secondaryPriority: number = 0): void {
    this.heap.push({ item, priority, secondaryPriority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.isEmpty()) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top.item;
  }

  private bubbleUp(idx: number): void {
    const element = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (this.compare(element, parent) < 0) {
        this.heap[idx] = parent;
        idx = parentIdx;
      } else {
        break;
      }
    }
    this.heap[idx] = element;
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length;
    const element = this.heap[idx];

    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.compare(this.heap[leftChildIdx], element) < 0) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const compareWith = swapIdx === null ? element : this.heap[leftChildIdx];
        if (this.compare(this.heap[rightChildIdx], compareWith) < 0) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;

      this.heap[idx] = this.heap[swapIdx];
      idx = swapIdx;
    }

    this.heap[idx] = element;
  }

  private compare(a: HeapItem<T>, b: HeapItem<T>): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Tie-break: prefer lower secondary priority (e.g., lower h)
    return (a.secondaryPriority ?? 0) - (b.secondaryPriority ?? 0);
  }
}

// Internal Search Node
interface InternalNode {
  state: PuzzleState;
  key: string;
  parent: InternalNode | null;
  move: Move | 'INITIAL';
  tileMoved: number;
  g: number;
  h: number;
  f: number;
}

function reconstructPath(node: InternalNode): MoveStep[] {
  const path: MoveStep[] = [];
  let curr: InternalNode | null = node;
  while (curr !== null) {
    path.unshift({
      state: curr.state,
      move: curr.move,
      tileMoved: curr.tileMoved,
      g: curr.g,
      h: curr.h,
      f: curr.f,
    });
    curr = curr.parent;
  }
  return path;
}

/**
 * Solve an 8-Puzzle using the chosen algorithm
 */
export function solvePuzzle(
  initialState: PuzzleState,
  algorithmId: AlgorithmId,
  goalState: PuzzleState = GOAL_STANDARD,
  options: SolverOptions = {}
): SolverResult {
  const startTime = performance.now();
  const maxNodes = options.maxNodes ?? 150000;
  const timeoutMs = options.timeoutMs ?? 7000;
  const goalMap = buildGoalMap(goalState);

  // If already at goal state
  if (areStatesEqual(initialState, goalState)) {
    const elapsed = performance.now() - startTime;
    return {
      success: true,
      algorithmId,
      algorithmName: ALGORITHMS[algorithmId].name,
      solution: [
        {
          state: initialState,
          move: 'INITIAL',
          tileMoved: 0,
          g: 0,
          h: 0,
          f: 0,
        },
      ],
      nodesExpanded: 0,
      nodesGenerated: 1,
      maxFrontierSize: 1,
      executionTimeMs: Math.round(elapsed * 100) / 100,
      pathLength: 0,
      isOptimal: true,
      searchTreeSample: [
        {
          id: 'root',
          state: initialState,
          move: 'ROOT',
          tileMoved: 0,
          g: 0,
          h: 0,
          f: 0,
          depth: 0,
          isSolutionNode: true,
        },
      ],
    };
  }

  // Heuristic function selector
  const getH = (state: PuzzleState): number => {
    switch (algorithmId) {
      case 'astar_linear_conflict':
        return linearConflict(state, goalState, goalMap);
      case 'astar_misplaced':
        return misplacedTiles(state, goalState);
      case 'astar_manhattan':
      case 'greedy_best_first':
      case 'ida_star':
      default:
        return manhattanDistance(state, goalState, goalMap);
    }
  };

  // Node recorder for visual tree sample (capped at 60 nodes for UI performance)
  const treeSample: SearchTreeNode[] = [];
  const nodeIds = new Map<string, string>();
  let nextId = 0;

  const recordNode = (node: InternalNode, parentId?: string) => {
    if (treeSample.length < 60) {
      const id = `node_${nextId++}`;
      nodeIds.set(node.key, id);
      treeSample.push({
        id,
        state: node.state,
        move: node.move === 'INITIAL' ? 'ROOT' : node.move,
        tileMoved: node.tileMoved,
        g: node.g,
        h: node.h,
        f: node.f,
        depth: node.g,
        parentId,
      });
    }
  };

  const markSolutionInTree = (solution: MoveStep[]) => {
    const solutionKeys = new Set(solution.map((s) => stateToKey(s.state)));
    for (const treeNode of treeSample) {
      if (solutionKeys.has(stateToKey(treeNode.state))) {
        treeNode.isSolutionNode = true;
      }
    }
  };

  // Route to the appropriate solver implementation
  switch (algorithmId) {
    case 'astar_manhattan':
    case 'astar_linear_conflict':
    case 'astar_misplaced':
    case 'greedy_best_first':
    case 'ucs':
      return runPrioritySearch(
        initialState,
        goalState,
        algorithmId,
        getH,
        startTime,
        maxNodes,
        timeoutMs,
        treeSample,
        recordNode,
        markSolutionInTree
      );

    case 'bfs':
      return runBFS(
        initialState,
        goalState,
        algorithmId,
        startTime,
        maxNodes,
        timeoutMs,
        treeSample,
        recordNode,
        markSolutionInTree
      );

    case 'dfs':
      return runDFS(
        initialState,
        goalState,
        algorithmId,
        options.dfsDepthLimit ?? 24,
        startTime,
        maxNodes,
        timeoutMs,
        treeSample,
        recordNode,
        markSolutionInTree
      );

    case 'ids':
      return runIDS(
        initialState,
        goalState,
        algorithmId,
        startTime,
        maxNodes,
        timeoutMs,
        treeSample,
        recordNode,
        markSolutionInTree
      );

    case 'ida_star':
      return runIDAStar(
        initialState,
        goalState,
        algorithmId,
        getH,
        startTime,
        maxNodes,
        timeoutMs,
        treeSample,
        recordNode,
        markSolutionInTree
      );

    default:
      throw new Error(`Unsupported algorithm: ${algorithmId}`);
  }
}

// ----------------- Priority Queue Based Searches (A*, Greedy, UCS) -----------------
function runPrioritySearch(
  initialState: PuzzleState,
  goalState: PuzzleState,
  algorithmId: AlgorithmId,
  getH: (s: PuzzleState) => number,
  startTime: number,
  maxNodes: number,
  timeoutMs: number,
  treeSample: SearchTreeNode[],
  recordNode: (n: InternalNode, pId?: string) => void,
  markSolutionInTree: (s: MoveStep[]) => void
): SolverResult {
  const pq = new MinPriorityQueue<InternalNode>();
  const visitedBestG = new Map<string, number>();

  const initH = getH(initialState);
  const initialInternal: InternalNode = {
    state: initialState,
    key: stateToKey(initialState),
    parent: null,
    move: 'INITIAL',
    tileMoved: 0,
    g: 0,
    h: initH,
    f: algorithmId === 'greedy_best_first' ? initH : algorithmId === 'ucs' ? 0 : initH,
  };

  recordNode(initialInternal);

  const getPriority = (g: number, h: number): { prio: number; sec: number } => {
    if (algorithmId === 'greedy_best_first') {
      return { prio: h, sec: g };
    }
    if (algorithmId === 'ucs') {
      return { prio: g, sec: 0 };
    }
    // A* (f = g + h, tie break with smaller h)
    return { prio: g + h, sec: h };
  };

  const { prio, sec } = getPriority(initialInternal.g, initialInternal.h);
  pq.push(initialInternal, prio, sec);
  visitedBestG.set(initialInternal.key, 0);

  let nodesExpanded = 0;
  let nodesGenerated = 1;
  let maxFrontierSize = 1;

  while (!pq.isEmpty()) {
    if (performance.now() - startTime > timeoutMs) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: ALGORITHMS[algorithmId].isOptimal,
        searchTreeSample: treeSample,
        errorReason: `Time limit exceeded (${timeoutMs / 1000}s). Try a heuristic search or an easier puzzle preset.`,
      };
    }

    if (nodesExpanded >= maxNodes) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: ALGORITHMS[algorithmId].isOptimal,
        searchTreeSample: treeSample,
        errorReason: `Explored maximum node limit (${maxNodes.toLocaleString()}). Try A* with Manhattan or Linear Conflict.`,
      };
    }

    const current = pq.pop()!;
    nodesExpanded++;

    // Goal test on expansion (crucial for A* and UCS optimality!)
    if (areStatesEqual(current.state, goalState)) {
      const solution = reconstructPath(current);
      markSolutionInTree(solution);
      return {
        success: true,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution,
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: solution.length - 1,
        isOptimal: ALGORITHMS[algorithmId].isOptimal,
        searchTreeSample: treeSample,
      };
    }

    // If we've found a strictly better path to this state already, skip
    const bestG = visitedBestG.get(current.key);
    if (bestG !== undefined && current.g > bestG) {
      continue;
    }

    const neighbors = getNeighbors(current.state);
    for (const neighbor of neighbors) {
      const neighborKey = stateToKey(neighbor.state);
      const tentativeG = current.g + 1;

      const prevBestG = visitedBestG.get(neighborKey);
      if (prevBestG === undefined || tentativeG < prevBestG) {
        visitedBestG.set(neighborKey, tentativeG);
        nodesGenerated++;

        const hVal = getH(neighbor.state);
        const childNode: InternalNode = {
          state: neighbor.state,
          key: neighborKey,
          parent: current,
          move: neighbor.move,
          tileMoved: neighbor.tileMoved,
          g: tentativeG,
          h: hVal,
          f: algorithmId === 'greedy_best_first' ? hVal : algorithmId === 'ucs' ? tentativeG : tentativeG + hVal,
        };

        recordNode(childNode, current.key);

        const p = getPriority(childNode.g, childNode.h);
        pq.push(childNode, p.prio, p.sec);
      }
    }

    if (pq.size > maxFrontierSize) {
      maxFrontierSize = pq.size;
    }
  }

  return {
    success: false,
    algorithmId,
    algorithmName: ALGORITHMS[algorithmId].name,
    solution: [],
    nodesExpanded,
    nodesGenerated,
    maxFrontierSize,
    executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    pathLength: 0,
    isOptimal: ALGORITHMS[algorithmId].isOptimal,
    searchTreeSample: treeSample,
    errorReason: 'No solution found in state space.',
  };
}

// ----------------- Breadth-First Search (BFS) -----------------
function runBFS(
  initialState: PuzzleState,
  goalState: PuzzleState,
  algorithmId: AlgorithmId,
  startTime: number,
  maxNodes: number,
  timeoutMs: number,
  treeSample: SearchTreeNode[],
  recordNode: (n: InternalNode, pId?: string) => void,
  markSolutionInTree: (s: MoveStep[]) => void
): SolverResult {
  const queue: InternalNode[] = [];
  const visited = new Set<string>();

  const root: InternalNode = {
    state: initialState,
    key: stateToKey(initialState),
    parent: null,
    move: 'INITIAL',
    tileMoved: 0,
    g: 0,
    h: 0,
    f: 0,
  };

  recordNode(root);
  queue.push(root);
  visited.add(root.key);

  let nodesExpanded = 0;
  let nodesGenerated = 1;
  let maxFrontierSize = 1;
  let head = 0; // use array pointer for O(1) queue shift

  while (head < queue.length) {
    if (performance.now() - startTime > timeoutMs) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: true,
        searchTreeSample: treeSample,
        errorReason: `BFS time limit (${timeoutMs / 1000}s) reached. BFS space grows exponentially O(b^d).`,
      };
    }

    if (nodesExpanded >= maxNodes) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: true,
        searchTreeSample: treeSample,
        errorReason: `Node limit (${maxNodes.toLocaleString()}) exceeded. Notice how BFS explodes compared to A*.`,
      };
    }

    const current = queue[head++];
    nodesExpanded++;

    if (areStatesEqual(current.state, goalState)) {
      const solution = reconstructPath(current);
      markSolutionInTree(solution);
      return {
        success: true,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution,
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: solution.length - 1,
        isOptimal: true,
        searchTreeSample: treeSample,
      };
    }

    const neighbors = getNeighbors(current.state);
    for (const neighbor of neighbors) {
      const neighborKey = stateToKey(neighbor.state);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        nodesGenerated++;

        const child: InternalNode = {
          state: neighbor.state,
          key: neighborKey,
          parent: current,
          move: neighbor.move,
          tileMoved: neighbor.tileMoved,
          g: current.g + 1,
          h: 0,
          f: current.g + 1,
        };

        recordNode(child, current.key);
        queue.push(child);
      }
    }

    const currentFrontier = queue.length - head;
    if (currentFrontier > maxFrontierSize) {
      maxFrontierSize = currentFrontier;
    }
  }

  return {
    success: false,
    algorithmId,
    algorithmName: ALGORITHMS[algorithmId].name,
    solution: [],
    nodesExpanded,
    nodesGenerated,
    maxFrontierSize,
    executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    pathLength: 0,
    isOptimal: true,
    searchTreeSample: treeSample,
    errorReason: 'Queue exhausted without reaching goal.',
  };
}

// ----------------- Depth-First Search (DFS with depth limit) -----------------
function runDFS(
  initialState: PuzzleState,
  goalState: PuzzleState,
  algorithmId: AlgorithmId,
  depthLimit: number,
  startTime: number,
  maxNodes: number,
  timeoutMs: number,
  treeSample: SearchTreeNode[],
  recordNode: (n: InternalNode, pId?: string) => void,
  markSolutionInTree: (s: MoveStep[]) => void
): SolverResult {
  const stack: InternalNode[] = [];
  const pathSet = new Set<string>(); // cycle detection on current branch

  const root: InternalNode = {
    state: initialState,
    key: stateToKey(initialState),
    parent: null,
    move: 'INITIAL',
    tileMoved: 0,
    g: 0,
    h: 0,
    f: 0,
  };

  recordNode(root);
  stack.push(root);

  let nodesExpanded = 0;
  let nodesGenerated = 1;
  let maxFrontierSize = 1;

  while (stack.length > 0) {
    if (performance.now() - startTime > timeoutMs) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: false,
        searchTreeSample: treeSample,
        errorReason: `DFS time limit reached. DFS without guidance explores deep dead-ends.`,
      };
    }

    if (nodesExpanded >= maxNodes) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: false,
        searchTreeSample: treeSample,
        errorReason: `DFS explored ${maxNodes.toLocaleString()} nodes. DFS can wander very deep!`,
      };
    }

    const current = stack.pop()!;
    nodesExpanded++;

    if (areStatesEqual(current.state, goalState)) {
      const solution = reconstructPath(current);
      markSolutionInTree(solution);
      return {
        success: true,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution,
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: solution.length - 1,
        isOptimal: false, // DFS is not optimal!
        searchTreeSample: treeSample,
      };
    }

    if (current.g < depthLimit) {
      // Check branch ancestor loop
      let ancestor: InternalNode | null = current;
      pathSet.clear();
      while (ancestor !== null) {
        pathSet.add(ancestor.key);
        ancestor = ancestor.parent;
      }

      const neighbors = getNeighbors(current.state);
      // Reverse to maintain intuitive order
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i];
        const nKey = stateToKey(neighbor.state);

        if (!pathSet.has(nKey)) {
          nodesGenerated++;
          const child: InternalNode = {
            state: neighbor.state,
            key: nKey,
            parent: current,
            move: neighbor.move,
            tileMoved: neighbor.tileMoved,
            g: current.g + 1,
            h: 0,
            f: current.g + 1,
          };
          recordNode(child, current.key);
          stack.push(child);
        }
      }
    }

    if (stack.length > maxFrontierSize) {
      maxFrontierSize = stack.length;
    }
  }

  return {
    success: false,
    algorithmId,
    algorithmName: ALGORITHMS[algorithmId].name,
    solution: [],
    nodesExpanded,
    nodesGenerated,
    maxFrontierSize,
    executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    pathLength: 0,
    isOptimal: false,
    searchTreeSample: treeSample,
    errorReason: `DFS reached depth limit ${depthLimit} without finding a solution.`,
  };
}

// ----------------- Iterative Deepening Search (IDS) -----------------
function runIDS(
  initialState: PuzzleState,
  goalState: PuzzleState,
  algorithmId: AlgorithmId,
  startTime: number,
  maxNodes: number,
  timeoutMs: number,
  treeSample: SearchTreeNode[],
  recordNode: (n: InternalNode, pId?: string) => void,
  markSolutionInTree: (s: MoveStep[]) => void
): SolverResult {
  let totalNodesExpanded = 0;
  let totalNodesGenerated = 0;
  let maxFrontierSize = 1;

  for (let depth = 0; depth <= 32; depth++) {
    const stack: InternalNode[] = [];
    const root: InternalNode = {
      state: initialState,
      key: stateToKey(initialState),
      parent: null,
      move: 'INITIAL',
      tileMoved: 0,
      g: 0,
      h: 0,
      f: 0,
    };
    stack.push(root);
    totalNodesGenerated++;

    const pathKeys = new Set<string>();

    while (stack.length > 0) {
      if (performance.now() - startTime > timeoutMs) {
        return {
          success: false,
          algorithmId,
          algorithmName: ALGORITHMS[algorithmId].name,
          solution: [],
          nodesExpanded: totalNodesExpanded,
          nodesGenerated: totalNodesGenerated,
          maxFrontierSize,
          executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
          pathLength: 0,
          isOptimal: true,
          searchTreeSample: treeSample,
          errorReason: `IDS time limit exceeded at depth ${depth}.`,
        };
      }

      if (totalNodesExpanded >= maxNodes) {
        return {
          success: false,
          algorithmId,
          algorithmName: ALGORITHMS[algorithmId].name,
          solution: [],
          nodesExpanded: totalNodesExpanded,
          nodesGenerated: totalNodesGenerated,
          maxFrontierSize,
          executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
          pathLength: 0,
          isOptimal: true,
          searchTreeSample: treeSample,
          errorReason: `IDS node limit reached at depth ${depth}.`,
        };
      }

      const current = stack.pop()!;
      totalNodesExpanded++;

      if (areStatesEqual(current.state, goalState)) {
        const solution = reconstructPath(current);
        markSolutionInTree(solution);
        return {
          success: true,
          algorithmId,
          algorithmName: ALGORITHMS[algorithmId].name,
          solution,
          nodesExpanded: totalNodesExpanded,
          nodesGenerated: totalNodesGenerated,
          maxFrontierSize,
          executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
          pathLength: solution.length - 1,
          isOptimal: true,
          searchTreeSample: treeSample,
        };
      }

      if (current.g < depth) {
        let ancestor: InternalNode | null = current;
        pathKeys.clear();
        while (ancestor !== null) {
          pathKeys.add(ancestor.key);
          ancestor = ancestor.parent;
        }

        const neighbors = getNeighbors(current.state);
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const neighbor = neighbors[i];
          const nKey = stateToKey(neighbor.state);
          if (!pathKeys.has(nKey)) {
            totalNodesGenerated++;
            const child: InternalNode = {
              state: neighbor.state,
              key: nKey,
              parent: current,
              move: neighbor.move,
              tileMoved: neighbor.tileMoved,
              g: current.g + 1,
              h: 0,
              f: current.g + 1,
            };
            if (treeSample.length < 60) recordNode(child, current.key);
            stack.push(child);
          }
        }
      }

      if (stack.length > maxFrontierSize) {
        maxFrontierSize = stack.length;
      }
    }
  }

  return {
    success: false,
    algorithmId,
    algorithmName: ALGORITHMS[algorithmId].name,
    solution: [],
    nodesExpanded: totalNodesExpanded,
    nodesGenerated: totalNodesGenerated,
    maxFrontierSize,
    executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    pathLength: 0,
    isOptimal: true,
    searchTreeSample: treeSample,
    errorReason: 'IDS exceeded maximum theoretical depth 32.',
  };
}

// ----------------- IDA* (Iterative Deepening A*) -----------------
function runIDAStar(
  initialState: PuzzleState,
  goalState: PuzzleState,
  algorithmId: AlgorithmId,
  getH: (s: PuzzleState) => number,
  startTime: number,
  maxNodes: number,
  timeoutMs: number,
  treeSample: SearchTreeNode[],
  recordNode: (n: InternalNode, pId?: string) => void,
  markSolutionInTree: (s: MoveStep[]) => void
): SolverResult {
  let threshold = getH(initialState);
  let nodesExpanded = 0;
  let nodesGenerated = 1;
  const maxFrontierSize = 32;

  const root: InternalNode = {
    state: initialState,
    key: stateToKey(initialState),
    parent: null,
    move: 'INITIAL',
    tileMoved: 0,
    g: 0,
    h: threshold,
    f: threshold,
  };
  recordNode(root);

  while (true) {
    if (performance.now() - startTime > timeoutMs) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: true,
        searchTreeSample: treeSample,
        errorReason: `IDA* timeout reached (${timeoutMs / 1000}s).`,
      };
    }

    let minAboveThreshold = Infinity;
    const path: InternalNode[] = [root];
    const pathKeys = new Set<string>([root.key]);

    // Recursive search with f-limit
    function search(node: InternalNode): InternalNode | null {
      nodesExpanded++;
      const f = node.g + node.h;
      if (f > threshold) {
        if (f < minAboveThreshold) {
          minAboveThreshold = f;
        }
        return null;
      }

      if (areStatesEqual(node.state, goalState)) {
        return node;
      }

      const neighbors = getNeighbors(node.state);
      for (const neighbor of neighbors) {
        const nKey = stateToKey(neighbor.state);
        if (!pathKeys.has(nKey)) {
          nodesGenerated++;
          const hVal = getH(neighbor.state);
          const child: InternalNode = {
            state: neighbor.state,
            key: nKey,
            parent: node,
            move: neighbor.move,
            tileMoved: neighbor.tileMoved,
            g: node.g + 1,
            h: hVal,
            f: node.g + 1 + hVal,
          };
          if (treeSample.length < 60) recordNode(child, node.key);

          path.push(child);
          pathKeys.add(nKey);

          const res = search(child);
          if (res !== null) return res;

          path.pop();
          pathKeys.delete(nKey);
        }
      }
      return null;
    }

    const found = search(root);
    if (found !== null) {
      const solution = reconstructPath(found);
      markSolutionInTree(solution);
      return {
        success: true,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution,
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: solution.length - 1,
        isOptimal: true,
        searchTreeSample: treeSample,
      };
    }

    if (minAboveThreshold === Infinity || minAboveThreshold > 50) {
      return {
        success: false,
        algorithmId,
        algorithmName: ALGORITHMS[algorithmId].name,
        solution: [],
        nodesExpanded,
        nodesGenerated,
        maxFrontierSize,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        pathLength: 0,
        isOptimal: true,
        searchTreeSample: treeSample,
        errorReason: 'IDA* threshold exceeded bounds.',
      };
    }

    threshold = minAboveThreshold;
  }
}

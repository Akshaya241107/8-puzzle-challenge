/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  PuzzleState,
  GOAL_STANDARD,
  areStatesEqual,
  generateRandomSolvable,
  PRESETS,
  getBlankIndex,
  indexToCoord,
  coordToIndex,
} from '../core/puzzle';
import { solvePuzzle, SolverResult } from '../core/solver';
import { Board } from './Board';
import { soundManager } from '../utils/sound';
import {
  Timer,
  Footprints,
  Lightbulb,
  Undo2,
  RotateCcw,
  Trophy,
  Star,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Zap,
} from 'lucide-react';

export type GameDifficulty = 'warmup' | 'easy' | 'medium' | 'hard' | 'master';

interface GameSoloViewProps {
  onWinCelebration?: () => void;
}

export const GameSoloView: React.FC<GameSoloViewProps> = () => {
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [initialState, setInitialState] = useState<PuzzleState>(
    PRESETS.find((p) => p.id === 'easy_6')?.state || GOAL_STANDARD
  );
  const [currentState, setCurrentState] = useState<PuzzleState>(initialState);
  const [moveHistory, setMoveHistory] = useState<PuzzleState[]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);

  // Timer
  const [timeSeconds, setTimeSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Optimal moves from initial state
  const [optimalMoves, setOptimalMoves] = useState<number>(6);

  // AI Hint state
  const [hintTile, setHintTile] = useState<number | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Victory state
  const [hasWon, setHasWon] = useState<boolean>(false);

  // Calculate optimal moves whenever initial state changes
  useEffect(() => {
    const res = solvePuzzle(initialState, 'astar_linear_conflict', GOAL_STANDARD);
    if (res.success) {
      setOptimalMoves(res.pathLength);
    }
  }, [initialState]);

  // Timer tick
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Load a new puzzle based on difficulty
  const startNewGame = (diff: GameDifficulty = difficulty) => {
    let newState: PuzzleState;
    if (diff === 'warmup') {
      const preset = PRESETS.find((p) => p.id === 'trivial_2');
      newState = preset ? preset.state : generateRandomSolvable(GOAL_STANDARD, 4);
    } else if (diff === 'easy') {
      const preset = PRESETS.find((p) => p.id === 'easy_6');
      newState = preset ? preset.state : generateRandomSolvable(GOAL_STANDARD, 8);
    } else if (diff === 'medium') {
      const preset = PRESETS.find((p) => p.id === 'medium_12');
      newState = preset ? preset.state : generateRandomSolvable(GOAL_STANDARD, 16);
    } else if (diff === 'hard') {
      const preset = PRESETS.find((p) => p.id === 'hard_20');
      newState = preset ? preset.state : generateRandomSolvable(GOAL_STANDARD, 30);
    } else {
      const preset = PRESETS.find((p) => p.id === 'extreme_31');
      newState = preset ? preset.state : generateRandomSolvable(GOAL_STANDARD, 50);
    }

    setInitialState(newState);
    setCurrentState(newState);
    setMoveHistory([]);
    setMoveCount(0);
    setTimeSeconds(0);
    setIsTimerRunning(false);
    setHintTile(null);
    setHintMessage(null);
    setHasWon(false);
  };

  // Handle tile click
  const handleTileClick = (clickedIdx: number) => {
    if (hasWon) return;

    const blankIdx = getBlankIndex(currentState);
    const bCoord = indexToCoord(blankIdx);
    const tCoord = indexToCoord(clickedIdx);

    // Adjacent check
    if (Math.abs(bCoord.row - tCoord.row) + Math.abs(bCoord.col - tCoord.col) === 1) {
      soundManager.playSlide();

      if (!isTimerRunning && timeSeconds === 0) {
        setIsTimerRunning(true);
      }

      const next = [...currentState];
      next[blankIdx] = next[clickedIdx];
      next[clickedIdx] = 0;

      setMoveHistory((prev) => [...prev, currentState]);
      setCurrentState(next);
      setMoveCount((c) => c + 1);
      setHintTile(null);
      setHintMessage(null);

      // Check win condition
      if (areStatesEqual(next, GOAL_STANDARD)) {
        setIsTimerRunning(false);
        setHasWon(true);
        soundManager.playVictory();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasWon) return;
      const blankIdx = getBlankIndex(currentState);
      const { row, col } = indexToCoord(blankIdx);
      let targetRow = row;
      let targetCol = col;

      if (e.key === 'ArrowUp' && row < 2) targetRow = row + 1;
      else if (e.key === 'ArrowDown' && row > 0) targetRow = row - 1;
      else if (e.key === 'ArrowLeft' && col < 2) targetCol = col + 1;
      else if (e.key === 'ArrowRight' && col > 0) targetCol = col - 1;
      else return;

      e.preventDefault();
      const targetIdx = coordToIndex(targetRow, targetCol);
      handleTileClick(targetIdx);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentState, hasWon]);

  // Undo move
  const handleUndo = () => {
    if (moveHistory.length === 0 || hasWon) return;
    const prev = moveHistory[moveHistory.length - 1];
    setMoveHistory((h) => h.slice(0, h.length - 1));
    setCurrentState(prev);
    setMoveCount((c) => Math.max(0, c - 1));
    setHintTile(null);
    setHintMessage(null);
  };

  // Restart level
  const handleRestart = () => {
    setCurrentState(initialState);
    setMoveHistory([]);
    setMoveCount(0);
    setTimeSeconds(0);
    setIsTimerRunning(false);
    setHintTile(null);
    setHintMessage(null);
    setHasWon(false);
  };

  // AI Hint function
  const handleGetHint = () => {
    if (hasWon) return;
    soundManager.playHint();
    const solution = solvePuzzle(currentState, 'astar_linear_conflict', GOAL_STANDARD);
    if (solution.success && solution.solution.length > 1) {
      const nextStep = solution.solution[1];
      setHintTile(nextStep.tileMoved);
      const remaining = solution.pathLength;
      setHintMessage(
        `AI Suggests: Move tile ${nextStep.tileMoved} (${nextStep.move}) · ${remaining} moves to finish!`
      );
    }
  };

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Rating stars
  const getStars = () => {
    if (moveCount <= optimalMoves) return 3;
    if (moveCount <= optimalMoves + 4) return 2;
    return 1;
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto w-full">
      {/* Difficulty Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
        {(
          [
            { id: 'warmup', label: 'Warmup', moves: '2-4' },
            { id: 'easy', label: 'Easy', moves: '6' },
            { id: 'medium', label: 'Medium', moves: '12' },
            { id: 'hard', label: 'Hard', moves: '20' },
            { id: 'master', label: 'Master', moves: '31' },
          ] as const
        ).map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setDifficulty(d.id);
              startNewGame(d.id);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              difficulty === d.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{d.label}</span>
            <span className="text-[10px] opacity-70 font-mono">({d.moves})</span>
          </button>
        ))}
      </div>

      {/* Game HUD Bar */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Timer className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Time
            </span>
            <span className="font-mono text-base font-bold text-white tabular-nums">
              {formatTime(timeSeconds)}
            </span>
          </div>
        </div>

        {/* Moves & Target */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Footprints className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Moves
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-base font-bold text-white tabular-nums">
                {moveCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / {optimalMoves} opt
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGetHint}
            disabled={hasWon}
            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
            title="Get AI Hint"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <button
            onClick={handleUndo}
            disabled={moveHistory.length === 0 || hasWon}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
            title="Undo move"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRestart}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Restart level"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Hint Banner if triggered */}
      {hintMessage && (
        <div className="w-full max-w-md bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2 shadow-md animate-fade-in">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{hintMessage}</span>
        </div>
      )}

      {/* Interactive 3x3 Sliding Board */}
      <div className="relative">
        <Board
          state={currentState}
          goalState={GOAL_STANDARD}
          onTileClick={handleTileClick}
          highlightTile={hintTile ?? undefined}
          interactive={!hasWon}
          size="lg"
        />
      </div>

      {/* Controls Hint */}
      <div className="text-center text-xs text-slate-400 flex items-center gap-2">
        <span>Click adjacent tiles or use <strong>Arrow Keys</strong> on your keyboard</span>
      </div>

      {/* VICTORY MODAL OVERLAY */}
      {hasWon && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center gap-5">
            {/* Trophy Icon with celebratory ring */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Trophy className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Puzzle Solved!</h3>
              <p className="text-xs text-slate-400 mt-1">
                You ordered all tiles 1 through 8 in their goal position!
              </p>
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-2 text-amber-400">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-7 h-7 ${
                    starIdx <= getStars()
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700 fill-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Performance Stats */}
            <div className="w-full grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">TIME</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatTime(timeSeconds)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">YOUR MOVES</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {moveCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">OPTIMAL</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">
                  {optimalMoves}
                </span>
              </div>
            </div>

            {/* Next Level / Play Again Buttons */}
            <div className="flex items-center gap-2 w-full pt-1">
              <button
                onClick={() => startNewGame(difficulty)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  const nextDiff: Record<GameDifficulty, GameDifficulty> = {
                    warmup: 'easy',
                    easy: 'medium',
                    medium: 'hard',
                    hard: 'master',
                    master: 'easy',
                  };
                  const next = nextDiff[difficulty];
                  setDifficulty(next);
                  startNewGame(next);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
              >
                Next Level
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

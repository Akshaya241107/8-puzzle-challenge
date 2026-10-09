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
import { Swords, User, Bot, Play, RotateCcw, Trophy, Sparkles } from 'lucide-react';

export const HumanVsAiRaceView: React.FC = () => {
  // Preset or random start state
  const [initialBoard, setInitialBoard] = useState<PuzzleState>(
    PRESETS.find((p) => p.id === 'medium_12')?.state || GOAL_STANDARD
  );

  // Player state
  const [playerState, setPlayerState] = useState<PuzzleState>(initialBoard);
  const [playerMoves, setPlayerMoves] = useState<number>(0);
  const [playerWon, setPlayerWon] = useState<boolean>(false);

  // AI Bot state
  const [aiState, setAiState] = useState<PuzzleState>(initialBoard);
  const [aiMoves, setAiMoves] = useState<number>(0);
  const [aiSolution, setAiSolution] = useState<PuzzleState[]>([]);
  const [aiWon, setAiWon] = useState<boolean>(false);

  // Race control states
  const [raceStatus, setRaceStatus] = useState<'idle' | 'countdown' | 'racing' | 'finished'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [botSpeed, setBotSpeed] = useState<number>(700); // ms per AI move

  const aiTimerRef = useRef<number | null>(null);

  // Reset or start new race board
  const setupNewRace = () => {
    if (aiTimerRef.current !== null) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    const newBoard = generateRandomSolvable(GOAL_STANDARD, 14);
    setInitialBoard(newBoard);
    setPlayerState(newBoard);
    setPlayerMoves(0);
    setPlayerWon(false);

    setAiState(newBoard);
    setAiMoves(0);
    setAiWon(false);

    // Pre-calculate AI path
    const res = solvePuzzle(newBoard, 'astar_manhattan', GOAL_STANDARD);
    if (res.success) {
      setAiSolution(res.solution.map((s) => s.state));
    }

    setRaceStatus('idle');
  };

  // Start Race Countdown
  const startCountdown = () => {
    // Solve AI path first
    const res = solvePuzzle(initialBoard, 'astar_manhattan', GOAL_STANDARD);
    if (res.success) {
      setAiSolution(res.solution.map((s) => s.state));
    }

    setPlayerState(initialBoard);
    setPlayerMoves(0);
    setPlayerWon(false);

    setAiState(initialBoard);
    setAiMoves(0);
    setAiWon(false);

    setRaceStatus('countdown');
    setCountdown(3);

    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countInterval);
          startRaceRunning(res.success ? res.solution.map((s) => s.state) : []);
          return 0;
        }
        return prev - 1;
      });
    }, 900);
  };

  const startRaceRunning = (solutionStates: PuzzleState[]) => {
    setRaceStatus('racing');

    let currentAiIndex = 0;
    aiTimerRef.current = window.setInterval(() => {
      if (currentAiIndex < solutionStates.length - 1) {
        currentAiIndex++;
        setAiState(solutionStates[currentAiIndex]);
        setAiMoves(currentAiIndex);

        if (areStatesEqual(solutionStates[currentAiIndex], GOAL_STANDARD)) {
          if (aiTimerRef.current !== null) clearInterval(aiTimerRef.current);
          setAiWon(true);
          setRaceStatus('finished');
          soundManager.playVictory();
        }
      }
    }, botSpeed);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current !== null) clearInterval(aiTimerRef.current);
    };
  }, []);

  // Player tile slide
  const handlePlayerTileClick = (clickedIdx: number) => {
    if (raceStatus !== 'racing' || playerWon || aiWon) return;

    const blankIdx = getBlankIndex(playerState);
    const bCoord = indexToCoord(blankIdx);
    const tCoord = indexToCoord(clickedIdx);

    if (Math.abs(bCoord.row - tCoord.row) + Math.abs(bCoord.col - tCoord.col) === 1) {
      soundManager.playSlide();
      const next = [...playerState];
      next[blankIdx] = next[clickedIdx];
      next[clickedIdx] = 0;

      setPlayerState(next);
      setPlayerMoves((m) => m + 1);

      if (areStatesEqual(next, GOAL_STANDARD)) {
        if (aiTimerRef.current !== null) clearInterval(aiTimerRef.current);
        setPlayerWon(true);
        setRaceStatus('finished');
        soundManager.playVictory();
      }
    }
  };

  // Player keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (raceStatus !== 'racing' || playerWon || aiWon) return;
      const blankIdx = getBlankIndex(playerState);
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
      handlePlayerTileClick(targetIdx);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerState, raceStatus, playerWon, aiWon]);

  return (
    <div className="flex flex-col items-center gap-6 max-w-5xl mx-auto w-full">
      {/* Race Setup Toolbar */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>Human vs AI Speed Race</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Can you solve the 8-puzzle before the A* algorithm reaches the goal?
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bot Speed Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">AI Pace:</span>
            {[
              { label: 'Casual', speed: 900 },
              { label: 'Normal', speed: 600 },
              { label: 'Fast', speed: 350 },
            ].map((p) => (
              <button
                key={p.label}
                disabled={raceStatus === 'racing'}
                onClick={() => setBotSpeed(p.speed)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  botSpeed === p.speed
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={setupNewRace}
            disabled={raceStatus === 'racing'}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            New Board
          </button>

          <button
            onClick={startCountdown}
            disabled={raceStatus === 'racing' || raceStatus === 'countdown'}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Race!</span>
          </button>
        </div>
      </div>

      {/* Countdown Overlay if active */}
      {raceStatus === 'countdown' && (
        <div className="text-center py-2 animate-pulse">
          <span className="font-mono text-5xl font-black text-amber-400">
            {countdown > 0 ? countdown : 'GO!'}
          </span>
        </div>
      )}

      {/* Dual Boards Arena Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* PLAYER COLUMN */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">You (Human)</span>
            </div>
            <div className="font-mono text-xs text-slate-300">
              Moves: <strong className="text-indigo-400 text-sm">{playerMoves}</strong>
            </div>
          </div>

          <Board
            state={playerState}
            goalState={GOAL_STANDARD}
            onTileClick={handlePlayerTileClick}
            interactive={raceStatus === 'racing' && !playerWon && !aiWon}
            size="md"
          />

          <span className="text-xs text-slate-400 text-center">
            {raceStatus === 'racing'
              ? 'Click adjacent tiles or press Arrow Keys'
              : 'Press "Start Race!" to begin'}
          </span>
        </div>

        {/* AI BOT COLUMN */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">AI Bot (A* Manhattan)</span>
            </div>
            <div className="font-mono text-xs text-slate-300">
              Moves: <strong className="text-cyan-400 text-sm">{aiMoves}</strong> / {aiSolution.length > 0 ? aiSolution.length - 1 : '?'}
            </div>
          </div>

          <Board
            state={aiState}
            goalState={GOAL_STANDARD}
            interactive={false}
            size="md"
          />

          <span className="text-xs text-slate-400 text-center">
            Bot automatically slides along the optimal path
          </span>
        </div>
      </div>

      {/* Race Winner Announcement Banner */}
      {raceStatus === 'finished' && (
        <div
          className={`w-full max-w-lg p-5 rounded-2xl border text-center flex flex-col items-center gap-3 shadow-2xl ${
            playerWon
              ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/50 border-rose-800/60 text-rose-200'
          }`}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {playerWon ? '🎉 Victory! You Beat the AI Bot!' : '🤖 AI Bot Won This Round!'}
            </h3>
            <p className="text-xs opacity-80 mt-1">
              {playerWon
                ? `You solved the puzzle in ${playerMoves} moves before the bot could finish!`
                : `The A* solver completed its optimal trajectory first. Try again with a lower bot pace or sharper moves!`}
            </p>
          </div>
          <button
            onClick={startCountdown}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-950 hover:bg-slate-200 transition-colors shadow"
          >
            Rematch Race
          </button>
        </div>
      )}
    </div>
  );
};

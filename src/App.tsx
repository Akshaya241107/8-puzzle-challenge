/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PuzzleState,
  GOAL_STANDARD,
  PRESETS,
  PuzzlePreset,
  getBlankIndex,
  indexToCoord,
  coordToIndex,
  generateRandomSolvable,
  areStatesEqual,
} from './core/puzzle';
import {
  AlgorithmId,
  solvePuzzle,
  SolverResult,
} from './core/solver';
import { Header, GameTab } from './components/Header';
import { Board } from './components/Board';
import { PlaybackControls } from './components/PlaybackControls';
import { AlgorithmSelector } from './components/AlgorithmSelector';
import { MetricsCard } from './components/MetricsCard';
import { SearchTreeVisualizer } from './components/SearchTreeVisualizer';
import { StateEditorModal } from './components/StateEditorModal';
import { GameSoloView } from './components/GameSoloView';
import { HumanVsAiRaceView } from './components/HumanVsAiRaceView';
import { soundManager } from './utils/sound';
import { RotateCcw, Shuffle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<GameTab>('play');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Auto-Solver specific state
  const defaultPreset = PRESETS.find((p) => p.id === 'medium_12') || PRESETS[0];
  const [solverState, setSolverState] = useState<PuzzleState>(defaultPreset.state);
  const [initialBoardState, setInitialBoardState] = useState<PuzzleState>(defaultPreset.state);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmId>('astar_linear_conflict');

  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [errorReason, setErrorReason] = useState<string | undefined>(undefined);

  const playbackTimerRef = useRef<number | null>(null);

  // Sound toggle
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  // Run solver
  const handleSolve = useCallback(() => {
    setIsPlaying(false);
    setIsSolving(true);
    setErrorReason(undefined);

    setTimeout(() => {
      try {
        const result = solvePuzzle(solverState, selectedAlgorithm, GOAL_STANDARD, {
          maxNodes: 120000,
          timeoutMs: 6500,
        });

        setSolverResult(result);
        if (result.success) {
          setInitialBoardState(solverState);
          setCurrentStepIndex(0);
        } else {
          setErrorReason(result.errorReason || 'Failed to find solution path.');
        }
      } catch (err: any) {
        setErrorReason(err?.message || 'An error occurred during search.');
      } finally {
        setIsSolving(false);
      }
    }, 40);
  }, [solverState, selectedAlgorithm]);

  // Stepping in Auto-Solver
  const handleStepForward = useCallback(() => {
    if (!solverResult || solverResult.solution.length === 0) return;
    if (currentStepIndex < solverResult.solution.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setSolverState(solverResult.solution[nextIdx].state);
      soundManager.playSlide();
    } else {
      setIsPlaying(false);
      soundManager.playVictory();
    }
  }, [solverResult, currentStepIndex]);

  const handleStepBackward = useCallback(() => {
    if (!solverResult || solverResult.solution.length === 0) return;
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setSolverState(solverResult.solution[prevIdx].state);
      soundManager.playSlide();
    }
  }, [solverResult, currentStepIndex]);

  const handleJumpToStart = () => {
    if (!solverResult || solverResult.solution.length === 0) return;
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSolverState(solverResult.solution[0].state);
  };

  const handleJumpToEnd = () => {
    if (!solverResult || solverResult.solution.length === 0) return;
    setIsPlaying(false);
    const lastIdx = solverResult.solution.length - 1;
    setCurrentStepIndex(lastIdx);
    setSolverState(solverResult.solution[lastIdx].state);
  };

  const handleSeek = (index: number) => {
    if (!solverResult || solverResult.solution.length === 0) return;
    setIsPlaying(false);
    setCurrentStepIndex(index);
    setSolverState(solverResult.solution[index].state);
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = window.setInterval(() => {
        handleStepForward();
      }, playbackSpeed);
    } else {
      if (playbackTimerRef.current !== null) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }
    return () => {
      if (playbackTimerRef.current !== null) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, handleStepForward]);

  // Manual tile slide in auto-solver view
  const handleManualTileClick = (clickedIdx: number) => {
    const blankIdx = getBlankIndex(solverState);
    const bCoord = indexToCoord(blankIdx);
    const tCoord = indexToCoord(clickedIdx);

    if (Math.abs(bCoord.row - tCoord.row) + Math.abs(bCoord.col - tCoord.col) === 1) {
      soundManager.playSlide();
      const nextState = [...solverState];
      nextState[blankIdx] = nextState[clickedIdx];
      nextState[clickedIdx] = 0;
      setSolverState(nextState);
      setInitialBoardState(nextState);
      setSolverResult(null);
      setIsPlaying(false);
      setCurrentStepIndex(0);
      setErrorReason(undefined);
    }
  };

  // Keyboard navigation for solver tab
  useEffect(() => {
    if (activeTab !== 'solver') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen) return;
      const blankIdx = getBlankIndex(solverState);
      const { row, col } = indexToCoord(blankIdx);
      let targetRow = row;
      let targetCol = col;

      if (e.key === 'ArrowUp' && row < 2) targetRow = row + 1;
      else if (e.key === 'ArrowDown' && row > 0) targetRow = row - 1;
      else if (e.key === 'ArrowLeft' && col < 2) targetCol = col + 1;
      else if (e.key === 'ArrowRight' && col > 0) targetCol = col - 1;
      else if (e.key === ' ') {
        if (solverResult && solverResult.solution.length > 1) {
          e.preventDefault();
          setIsPlaying((prev) => !prev);
        }
        return;
      } else {
        return;
      }

      e.preventDefault();
      const targetIdx = coordToIndex(targetRow, targetCol);
      handleManualTileClick(targetIdx);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [solverState, isEditorOpen, solverResult, activeTab]);

  const handleRandomShuffle = () => {
    setIsPlaying(false);
    const shuffled = generateRandomSolvable(GOAL_STANDARD, 25);
    setSolverState(shuffled);
    setInitialBoardState(shuffled);
    setSolverResult(null);
    setCurrentStepIndex(0);
    setErrorReason(undefined);
  };

  const handleSelectPreset = (p: PuzzlePreset) => {
    setIsPlaying(false);
    setSolverState([...p.state]);
    setInitialBoardState([...p.state]);
    setSolverResult(null);
    setCurrentStepIndex(0);
    setErrorReason(undefined);
  };

  const currentStep = solverResult?.solution[currentStepIndex];
  const highlightTile = currentStep?.tileMoved;
  const isSolved = areStatesEqual(solverState, GOAL_STANDARD);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewGame={() => {
          if (activeTab === 'solver') handleRandomShuffle();
          else {
            // Re-render child view with fresh key/state
            setActiveTab((t) => (t === 'play' ? 'play' : 'play'));
          }
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: PLAY SOLO (GAME MODE) */}
        {activeTab === 'play' && <GameSoloView />}

        {/* TAB 2: HUMAN VS AI RACE */}
        {activeTab === 'race' && <HumanVsAiRaceView />}

        {/* TAB 3: AI AUTO-SOLVER */}
        {activeTab === 'solver' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Board Stage */}
              <div className="lg:col-span-6 flex flex-col items-center gap-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
                <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Puzzle Board
                    </span>
                    {isSolved && (
                      <span className="text-xs text-emerald-400 font-medium">
                        · Solved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSolverState([...initialBoardState]);
                        setCurrentStepIndex(0);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset</span>
                    </button>
                    <button
                      onClick={handleRandomShuffle}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>

                <Board
                  state={solverState}
                  goalState={GOAL_STANDARD}
                  onTileClick={handleManualTileClick}
                  highlightTile={highlightTile}
                  interactive={!isPlaying}
                  size="md"
                />

                <div className="text-center text-xs text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Click adjacent tiles or press Arrow Keys to slide</span>
                </div>

                {solverResult && solverResult.solution.length > 1 && (
                  <PlaybackControls
                    solution={solverResult.solution}
                    currentStepIndex={currentStepIndex}
                    isPlaying={isPlaying}
                    onPlayToggle={() => setIsPlaying(!isPlaying)}
                    onStepForward={handleStepForward}
                    onStepBackward={handleStepBackward}
                    onJumpToStart={handleJumpToStart}
                    onJumpToEnd={handleJumpToEnd}
                    onSeek={handleSeek}
                    speed={playbackSpeed}
                    onSpeedChange={setPlaybackSpeed}
                  />
                )}
              </div>

              {/* Right Control Deck */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                <AlgorithmSelector
                  selectedAlgorithm={selectedAlgorithm}
                  onSelectAlgorithm={(id) => {
                    setSelectedAlgorithm(id);
                    setSolverResult(null);
                  }}
                  onSolve={handleSolve}
                  isSolving={isSolving}
                  currentState={solverState}
                  onSelectPreset={handleSelectPreset}
                  onOpenCustomEditor={() => setIsEditorOpen(true)}
                />

                <MetricsCard result={solverResult} errorReason={errorReason} />
              </div>
            </div>

            {/* Tree visualizer */}
            {solverResult && solverResult.searchTreeSample.length > 0 && (
              <SearchTreeVisualizer
                nodes={solverResult.searchTreeSample}
                onSelectNodeState={(state) => setSolverState(state)}
              />
            )}
          </div>
        )}
      </main>

      {/* Custom State Editor Modal */}
      <StateEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        currentState={solverState}
        onApplyState={(newState) => {
          setSolverState(newState);
          setInitialBoardState(newState);
          setSolverResult(null);
          setCurrentStepIndex(0);
          setErrorReason(undefined);
        }}
      />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlgorithmId,
  AlgorithmCategory,
  ALGORITHMS,
} from '../core/solver';
import {
  PRESETS,
  PuzzlePreset,
  PuzzleState,
  isSolvable,
  countInversions,
} from '../core/puzzle';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface AlgorithmSelectorProps {
  selectedAlgorithm: AlgorithmId;
  onSelectAlgorithm: (id: AlgorithmId) => void;
  onSolve: () => void;
  isSolving: boolean;
  currentState: PuzzleState;
  onSelectPreset: (preset: PuzzlePreset) => void;
  onOpenCustomEditor: () => void;
}

export const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  selectedAlgorithm,
  onSelectAlgorithm,
  onSolve,
  isSolving,
  currentState,
  onSelectPreset,
  onOpenCustomEditor,
}) => {
  const [activeCategory, setActiveCategory] = useState<AlgorithmCategory>('heuristic');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const currentAlgo = ALGORITHMS[selectedAlgorithm];
  const solvable = isSolvable(currentState);
  const inversions = countInversions(currentState);

  const algorithmsList = Object.values(ALGORITHMS).filter(
    (a) => a.category === activeCategory
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-xl">
      {/* Configuration Header & Solvability Pill-free status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Search Algorithm Configuration
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>Inversions: <strong className="font-mono text-slate-200">{inversions}</strong></span>
            <span aria-hidden="true">·</span>
            <span className={solvable ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
              {solvable ? 'Solvable Configuration' : 'Mathematically Unsolvable'}
            </span>
          </div>
        </div>

        {/* Preset & Custom Triggers */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Load Preset</span>
            </button>

            {showPresetDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 max-h-96 overflow-y-auto">
                <span className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                  Preset Configurations
                </span>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPreset(p);
                      setShowPresetDropdown(false);
                    }}
                    className="text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] text-indigo-400">
                        {p.optimalMoves} moves
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onOpenCustomEditor}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
          >
            Edit State
          </button>
        </div>
      </div>

      {/* Category Segmented Tabs */}
      <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800/80">
        <button
          onClick={() => {
            setActiveCategory('heuristic');
            if (currentAlgo.category !== 'heuristic') {
              onSelectAlgorithm('astar_linear_conflict');
            }
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeCategory === 'heuristic'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Heuristic / Informed Search
        </button>
        <button
          onClick={() => {
            setActiveCategory('uninformed');
            if (currentAlgo.category !== 'uninformed') {
              onSelectAlgorithm('bfs');
            }
          }}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeCategory === 'uninformed'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Uninformed / Blind Search
        </button>
      </div>

      {/* Algorithm Radio Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {algorithmsList.map((algo) => {
          const isSelected = selectedAlgorithm === algo.id;
          return (
            <button
              key={algo.id}
              onClick={() => onSelectAlgorithm(algo.id)}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-md'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    isSelected ? 'text-indigo-200' : 'text-slate-200'
                  }`}
                >
                  {algo.name}
                </span>
                {algo.isOptimal && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Optimal
                  </span>
                )}
              </div>

              {algo.heuristicName && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {algo.heuristicName}
                </span>
              )}

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {algo.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Algorithm Theoretical Summary Strip */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400">Time:</span>{' '}
            <span className="font-mono text-slate-200">{currentAlgo.timeComplexity}</span>
          </div>
          <div>
            <span className="text-slate-400">Space:</span>{' '}
            <span className="font-mono text-slate-200">{currentAlgo.spaceComplexity}</span>
          </div>
          <div>
            <span className="text-slate-400">Complete:</span>{' '}
            <span className="font-mono text-emerald-400">
              {currentAlgo.isComplete ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Solve Button */}
      <button
        onClick={onSolve}
        disabled={isSolving || !solvable}
        className={`w-full py-3 px-4 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md ${
          !solvable
            ? 'bg-rose-950/50 border border-rose-800 text-rose-300 cursor-not-allowed'
            : isSolving
            ? 'bg-indigo-700 text-white cursor-wait opacity-80'
            : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white'
        }`}
      >
        {isSolving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Searching State Space...</span>
          </>
        ) : !solvable ? (
          <>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Unsolvable Configuration (Odd Parity)</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Solve with {currentAlgo.name}</span>
          </>
        )}
      </button>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PuzzleState,
  GOAL_STANDARD,
  PRESETS,
  PuzzlePreset,
  countInversions,
  getInversionPairs,
  isSolvable,
  generateRandomSolvable,
} from '../core/puzzle';
import { X, Shuffle, RotateCcw, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: PuzzleState;
  onApplyState: (newState: PuzzleState) => void;
}

export const StateEditorModal: React.FC<StateEditorModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onApplyState,
}) => {
  const [draftState, setDraftState] = useState<number[]>([...currentState]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const inversions = countInversions(draftState);
  const inversionPairs = getInversionPairs(draftState);
  const solvable = isSolvable(draftState);

  // Swap tiles when clicked
  const handleTileClick = (idx: number) => {
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      if (selectedIdx !== idx) {
        const next = [...draftState];
        const temp = next[selectedIdx];
        next[selectedIdx] = next[idx];
        next[idx] = temp;
        setDraftState(next);
      }
      setSelectedIdx(null);
    }
  };

  // Fix parity by swapping the first two non-blank tiles
  const handleFixParity = () => {
    const next = [...draftState];
    const nonBlankIndices = next
      .map((val, idx) => ({ val, idx }))
      .filter((x) => x.val !== 0)
      .map((x) => x.idx);

    if (nonBlankIndices.length >= 2) {
      const i = nonBlankIndices[0];
      const j = nonBlankIndices[1];
      const temp = next[i];
      next[i] = next[j];
      next[j] = temp;
      setDraftState(next);
    }
  };

  const handleShuffle = () => {
    setDraftState([...generateRandomSolvable(GOAL_STANDARD, 35)]);
    setSelectedIdx(null);
  };

  const handleReset = () => {
    setDraftState([...GOAL_STANDARD]);
    setSelectedIdx(null);
  };

  const handlePreset = (p: PuzzlePreset) => {
    setDraftState([...p.state]);
    setSelectedIdx(null);
  };

  const handleApply = () => {
    onApplyState(draftState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">
              Edit Puzzle State & Parity Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any two tiles to swap their positions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3x3 Editor Grid & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
          <div className="grid grid-cols-3 gap-2 w-56 h-56 p-2 bg-slate-950 rounded-xl border border-slate-800">
            {draftState.map((tile, idx) => {
              const isSelected = selectedIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  className={`w-full h-full rounded-lg font-mono text-xl font-bold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : tile === 0
                      ? 'bg-slate-900 text-slate-700 border border-dashed border-slate-800'
                      : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  {tile === 0 ? '·' : tile}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-slate-400">Quick Actions</span>
            <button
              onClick={handleShuffle}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Random Solvable</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset to Goal</span>
            </button>
            {!solvable && (
              <button
                onClick={handleFixParity}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fix Parity (Make Solvable)</span>
              </button>
            )}
          </div>
        </div>

        {/* Inversion Mathematical Diagnostic */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col gap-1.5 text-xs ${
            solvable
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <div className="flex items-center gap-1.5">
              {solvable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>
                {solvable ? 'Solvable State' : 'Unsolvable State (Mathematical Inversion Mismatch)'}
              </span>
            </div>
            <span className="font-mono text-xs">
              Inversions: {inversions} ({inversions % 2 === 0 ? 'Even' : 'Odd'})
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {solvable
              ? 'Since the 8-puzzle grid dimension N=3 is odd, any state with an even inversion parity can reach the standard goal state.'
              : 'States with odd inversion parity live in the second disjoint half of the permutation space (181,440 unreachable states). Swap two tiles or click "Fix Parity" above.'}
          </p>
          {inversionPairs.length > 0 && (
            <div className="text-[10px] text-slate-400 font-mono truncate pt-1">
              Inversion Pairs: {inversionPairs.slice(0, 8).map(([a, b]) => `(${a}>${b})`).join(', ')}
              {inversionPairs.length > 8 && ` +${inversionPairs.length - 8} more`}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-md"
          >
            Apply to Board
          </button>
        </div>
      </div>
    </div>
  );
};

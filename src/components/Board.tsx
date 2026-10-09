/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  PuzzleState,
  GOAL_STANDARD,
  getBlankIndex,
  indexToCoord,
  coordToIndex,
} from '../core/puzzle';
import { Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface BoardProps {
  state: PuzzleState;
  goalState?: PuzzleState;
  onTileClick?: (tileIndex: number) => void;
  highlightTile?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showOverlay?: 'none' | 'goal_diff' | 'manhattan';
}

export const Board: React.FC<BoardProps> = ({
  state,
  goalState = GOAL_STANDARD,
  onTileClick,
  highlightTile,
  interactive = true,
  size = 'md',
  showOverlay = 'none',
}) => {
  const blankIdx = getBlankIndex(state);
  const blankCoord = indexToCoord(blankIdx);

  // Determine which tiles are valid to click (adjacent to blank)
  const isAdjacentToBlank = (index: number): boolean => {
    if (index === blankIdx) return false;
    const coord = indexToCoord(index);
    return Math.abs(coord.row - blankCoord.row) + Math.abs(coord.col - blankCoord.col) === 1;
  };

  // Get directional arrow towards the blank space
  const getDirectionToBlank = (index: number): 'up' | 'down' | 'left' | 'right' | null => {
    if (!isAdjacentToBlank(index)) return null;
    const coord = indexToCoord(index);
    if (coord.row < blankCoord.row) return 'down';
    if (coord.row > blankCoord.row) return 'up';
    if (coord.col < blankCoord.col) return 'right';
    if (coord.col > blankCoord.col) return 'left';
    return null;
  };

  const sizeClasses = {
    sm: 'w-48 h-48 sm:w-56 sm:h-56 p-2 gap-1.5 rounded-xl',
    md: 'w-72 h-72 sm:w-80 sm:h-80 p-3 gap-2 rounded-2xl',
    lg: 'w-80 h-80 sm:w-96 sm:h-96 p-3.5 gap-2.5 rounded-2xl',
  };

  const tileTextSizes = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl font-bold',
    lg: 'text-3xl sm:text-4xl font-bold',
  };

  return (
    <div className="flex flex-col items-center">
      {/* 3x3 Puzzle Grid */}
      <div
        className={`grid grid-cols-3 bg-slate-900 border border-slate-800 shadow-2xl relative select-none ${sizeClasses[size]}`}
      >
        {state.map((tile, idx) => {
          const isBlank = tile === 0;
          const isCorrect = !isBlank && tile === goalState[idx];
          const canMove = interactive && isAdjacentToBlank(idx);
          const dir = getDirectionToBlank(idx);
          const isHighlighted = highlightTile === tile && !isBlank;

          if (isBlank) {
            return (
              <div
                key={`empty-${idx}`}
                className="w-full h-full rounded-xl bg-slate-950/70 border border-dashed border-slate-800/80 flex items-center justify-center transition-colors"
              >
                <span className="text-slate-700 text-xs font-mono font-medium">EMPTY</span>
              </div>
            );
          }

          // Calculate goal position offset for overlay
          const goalIdx = goalState.indexOf(tile);
          const currentCoord = indexToCoord(idx);
          const goalCoord = indexToCoord(goalIdx);
          const manhattan = Math.abs(currentCoord.row - goalCoord.row) + Math.abs(currentCoord.col - goalCoord.col);

          return (
            <motion.button
              key={`tile-${tile}`}
              layout
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              onClick={() => {
                if (interactive && canMove && onTileClick) {
                  onTileClick(idx);
                }
              }}
              disabled={!interactive || !canMove}
              className={`w-full h-full rounded-xl flex flex-col items-center justify-center relative font-mono transition-all duration-150 ${
                isHighlighted
                  ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                  : ''
              } ${
                canMove
                  ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                  : 'cursor-default'
              } ${
                isCorrect
                  ? 'bg-slate-800/90 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 shadow-md'
                  : 'bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-slate-600 shadow-sm'
              }`}
            >
              {/* Tile Number */}
              <span className={`${tileTextSizes[size]} tracking-tight`}>
                {tile}
              </span>

              {/* Sub-label: Goal target or Manhattan distance if overlay enabled */}
              {showOverlay === 'manhattan' && (
                <span className="text-[10px] text-slate-400 absolute bottom-1 font-mono">
                  dist: {manhattan}
                </span>
              )}

              {/* Goal-matched indicator dot / check */}
              {isCorrect && (
                <span
                  title="In Goal Position"
                  className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px]"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}

              {/* Direction prompt for clickable tile */}
              {canMove && interactive && (
                <div className="absolute top-1.5 left-1.5 text-indigo-400/80 opacity-70">
                  {dir === 'up' && <ArrowUp className="w-3 h-3" />}
                  {dir === 'down' && <ArrowDown className="w-3 h-3" />}
                  {dir === 'left' && <ArrowLeft className="w-3 h-3" />}
                  {dir === 'right' && <ArrowRight className="w-3 h-3" />}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

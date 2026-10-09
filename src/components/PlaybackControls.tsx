/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { MoveStep } from '../core/puzzle';

interface PlaybackControlsProps {
  solution: MoveStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSeek: (stepIndex: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  solution,
  currentStepIndex,
  isPlaying,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToStart,
  onJumpToEnd,
  onSeek,
  speed,
  onSpeedChange,
}) => {
  const totalSteps = solution.length > 0 ? solution.length - 1 : 0;
  const currentStep = solution[currentStepIndex];

  const speedOptions = [
    { label: '0.5x', value: 1200 },
    { label: '1x', value: 600 },
    { label: '2x', value: 300 },
    { label: '4x', value: 120 },
  ];

  if (solution.length <= 1) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
      {/* Current Step Metadata Banner */}
      <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-300 gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            Step {currentStepIndex} of {totalSteps}
          </span>
          {currentStep && currentStep.move !== 'INITIAL' && (
            <span className="text-slate-400">
              · Tile <strong className="text-indigo-400 font-mono">{currentStep.tileMoved}</strong> moved{' '}
              <strong className="text-slate-200">{currentStep.move}</strong>
            </span>
          )}
          {currentStepIndex === totalSteps && totalSteps > 0 && (
            <span className="text-emerald-400 font-medium">· Goal Reached!</span>
          )}
        </div>

        {/* f = g + h costs */}
        {currentStep && (
          <div className="flex items-center gap-3 font-mono text-xs text-slate-400 tabular-nums">
            <span>g: {currentStep.g}</span>
            <span>h: {currentStep.h}</span>
            <span className="text-indigo-400 font-semibold">f: {currentStep.f}</span>
          </div>
        )}
      </div>

      {/* Scrubber slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStepIndex}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Button Controls Row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onJumpToStart}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Jump to Start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onStepBackward}
            disabled={currentStepIndex === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Step Backward (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayToggle}
            className={`px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title="Space to Play/Pause"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={onStepForward}
            disabled={currentStepIndex >= totalSteps}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Step Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onJumpToEnd}
            disabled={currentStepIndex >= totalSteps}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
            title="Jump to Goal"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 px-1 text-[11px]">Speed:</span>
          {speedOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onSpeedChange(opt.value)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                speed === opt.value
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

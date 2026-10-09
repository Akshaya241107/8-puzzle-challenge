/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Gamepad2, Swords, Bot, Volume2, VolumeX, Shuffle } from 'lucide-react';

export type GameTab = 'play' | 'race' | 'solver';

interface HeaderProps {
  activeTab: GameTab;
  onSelectTab: (tab: GameTab) => void;
  onNewGame: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onNewGame,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md font-mono font-bold text-base">
            8
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            8-Puzzle Challenge
          </span>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => onSelectTab('play')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'play'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Play Solo</span>
          </button>

          <button
            onClick={() => onSelectTab('race')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'race'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Swords className="w-4 h-4 text-amber-400" />
            <span>Human vs AI Race</span>
          </button>

          <button
            onClick={() => onSelectTab('solver')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'solver'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>AI Auto-Solver</span>
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSound}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={onNewGame}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};

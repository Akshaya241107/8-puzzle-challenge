/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SearchTreeNode } from '../core/solver';
import { PuzzleState } from '../core/puzzle';
import { Network, Eye } from 'lucide-react';

interface SearchTreeVisualizerProps {
  nodes: SearchTreeNode[];
  onSelectNodeState?: (state: PuzzleState) => void;
}

export const SearchTreeVisualizer: React.FC<SearchTreeVisualizerProps> = ({
  nodes,
  onSelectNodeState,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!nodes || nodes.length === 0) {
    return null;
  }

  // Filter or take first 30-40 nodes for high visual clarity
  const displayNodes = nodes.slice(0, 36);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">
            State-Space Tree & Frontier Exploration
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Showing {displayNodes.length} expanded nodes · Green = Solution path
        </span>
      </div>

      {/* Grid of Explored State Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
        {displayNodes.map((n) => {
          const isSelected = selectedNodeId === n.id;
          return (
            <button
              key={n.id}
              onClick={() => {
                setSelectedNodeId(n.id);
                if (onSelectNodeState) {
                  onSelectNodeState(n.state);
                }
              }}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                n.isSolutionNode
                  ? 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              } ${
                isSelected ? 'ring-2 ring-indigo-400' : ''
              }`}
            >
              {/* Header: Move & Depth */}
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={n.isSolutionNode ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
                  {n.move}
                </span>
                <span className="text-slate-400">d={n.depth}</span>
              </div>

              {/* Mini 3x3 Tile Grid */}
              <div className="grid grid-cols-3 gap-0.5 bg-slate-900 p-1 rounded-md border border-slate-800">
                {n.state.map((tile, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded text-[9px] font-mono flex items-center justify-center ${
                      tile === 0
                        ? 'bg-slate-950 text-slate-700'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {tile === 0 ? '' : tile}
                  </div>
                ))}
              </div>

              {/* f = g + h metrics */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                <span>g:{n.g}</span>
                <span>h:{n.h}</span>
                <span className="text-indigo-400 font-semibold">f:{n.f}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

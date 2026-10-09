/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SolverResult } from '../core/solver';
import { Clock, Cpu, Layers, GitCommit, CheckCircle2, AlertCircle } from 'lucide-react';

interface MetricsCardProps {
  result: SolverResult | null;
  errorReason?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ result, errorReason }) => {
  if (errorReason) {
    return (
      <div className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-5 text-rose-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-rose-300">Search Terminated</span>
          <p className="text-xs text-rose-300/80 leading-relaxed">{errorReason}</p>
        </div>
      </div>
    );
  }

  if (!result || !result.success) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center text-slate-400 min-h-[160px]">
        <span className="text-sm">Click "Solve" to run the search algorithm</span>
        <span className="text-xs text-slate-400 mt-1">
          Metrics on nodes expanded, memory footprint, and path cost will appear here
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Metric Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs text-slate-400">Search Results</span>
          <h3 className="text-sm font-semibold text-white">
            {result.algorithmName}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {result.isOptimal ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Optimal Solution</span>
            </div>
          ) : (
            <span className="text-xs text-amber-400 font-medium">
              Suboptimal Path
            </span>
          )}
        </div>
      </div>

      {/* Grid of 4 Key Quantities */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Solution Length */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
            <span>Path Moves</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
            {result.pathLength}
          </span>
          <span className="text-[10px] text-slate-400">optimal cost g*</span>
        </div>

        {/* Nodes Expanded */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Expanded</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {result.nodesExpanded.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">nodes evaluated</span>
        </div>

        {/* Max Frontier / Peak Memory */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Peak Memory</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tabular-nums">
            {result.maxFrontierSize.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">frontier size</span>
        </div>

        {/* Execution Time */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Execution</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300 tabular-nums">
            {result.executionTimeMs} ms
          </span>
          <span className="text-[10px] text-slate-400">solve runtime</span>
        </div>
      </div>
    </div>
  );
};

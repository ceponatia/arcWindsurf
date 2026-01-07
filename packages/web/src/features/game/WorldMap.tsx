import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { activeActors, actorStates } from '../../signals/actors.js';
import { currentTick } from '../../signals/session.js';

export const WorldMap: React.FC = () => {
  useSignals();
  const actors = activeActors.value;
  const states = actorStates.value;
  const tick = currentTick.value;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">World Map</h3>
        <span className="text-[10px] font-mono text-emerald-500">Tick: {tick}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {actors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <svg
              className="w-8 h-8 opacity-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm italic">Synchronizing actors...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {actors.map((actorId: string) => {
              const state = states[actorId];
              return (
                <div
                  key={actorId}
                  className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-violet-300">{actorId}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${state ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}
                    />
                  </div>
                  {state ? (
                    <div className="text-[10px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Location:</span>
                        <span className="text-slate-300">{state.locationId || 'Unknown'}</span>
                      </div>
                      {state.hp !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Health</span>
                            <span className="text-slate-400">{state.hp}%</span>
                          </div>
                          <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500/80 transition-all duration-500"
                              style={{ width: `${state.hp}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">No state data yet</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

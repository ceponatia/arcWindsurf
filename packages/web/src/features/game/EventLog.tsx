import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { eventLog } from '../../signals/events.js';

export const EventLog: React.FC = () => {
  useSignals();
  const events = eventLog.value;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-slate-800 border-b border-slate-700">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          World Events
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-slate-600 italic px-1">Waiting for events...</div>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="flex gap-2 py-0.5 border-b border-white/5 last:border-0">
              <span className="text-slate-500 flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="text-violet-400 flex-shrink-0">[{event.type}]</span>
              <span className="text-slate-300 break-all">
                {typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

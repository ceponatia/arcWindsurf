import React, { useState } from 'react';
import type { TurnMetadata, AgentOutputWithType, PhaseTiming } from '../../../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Types for turn events from the API
interface TurnEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface StateChanges {
  patchCount: number;
  modifiedPaths: string[];
  patches?: {
    op: string;
    path: string;
    value?: unknown;
  }[];
}

export interface DebugSidebarProps {
  metadata: TurnMetadata | null;
  events?: TurnEvent[];
  stateChanges?: StateChanges | null;
}

// Agent display configuration
const AGENT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  map: {
    label: 'Map',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-950/40',
  },
  npc: {
    label: 'NPC',
    color: 'text-violet-300',
    bgColor: 'bg-violet-950/40',
  },
  rules: {
    label: 'Rules',
    color: 'text-amber-300',
    bgColor: 'bg-amber-950/40',
  },
  parser: {
    label: 'Parser',
    color: 'text-sky-300',
    bgColor: 'bg-sky-950/40',
  },
  sensory: {
    label: 'Sensory',
    color: 'text-pink-300',
    bgColor: 'bg-pink-950/40',
  },
  proximity: {
    label: 'Proximity',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-950/40',
  },
  custom: {
    label: 'Custom',
    color: 'text-slate-300',
    bgColor: 'bg-slate-800/40',
  },
};

// =============================================================================
// Tool Calls Section
// =============================================================================

interface ToolCallsSectionProps {
  events: TurnEvent[];
}

const ToolCallsSection: React.FC<ToolCallsSectionProps> = ({ events }) => {
  const [expanded, setExpanded] = useState(true);

  const toolCalls = events.filter((e) => e.type === 'tool-called');
  const toolResults = events.filter((e) => e.type === 'tool-result');

  if (toolCalls.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-blue-300">🔧 Tools</span>
          <span className="text-xs text-slate-400">No tools called</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/50 bg-blue-950/20 overflow-hidden">
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-blue-300">🔧 Tools</span>
          <span className="text-xs text-slate-200">{toolCalls.length} called</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-2">
          {toolCalls.map((call, idx) => {
            const toolName = String(call.payload['tool']);
            const args = call.payload['args'] as string | undefined;
            const result = toolResults[idx];
            const success = result?.payload?.['success'] as boolean | undefined;

            let parsedArgs: Record<string, unknown> | null = null;
            if (args) {
              try {
                const parsed: unknown = JSON.parse(args);
                parsedArgs = isRecord(parsed) ? parsed : null;
              } catch {
                // ignore
              }
            }

            return (
              <div
                key={idx}
                className="rounded border border-slate-700/40 bg-slate-900/50 p-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-blue-300">{toolName}</span>
                  {success !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}
                    >
                      {success ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                {parsedArgs && Object.keys(parsedArgs).length > 0 && (
                  <div className="text-[10px] text-slate-400 font-mono bg-slate-950/50 rounded p-1.5 overflow-x-auto">
                    {Object.entries(parsedArgs).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-500">{k}:</span>{' '}
                        <span className="text-slate-300">
                          {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// State Changes Section
// =============================================================================

interface StateChangesSectionProps {
  stateChanges: StateChanges;
}

const StateChangesSection: React.FC<StateChangesSectionProps> = ({ stateChanges }) => {
  const [expanded, setExpanded] = useState(false);
  const [showPatches, setShowPatches] = useState(false);

  if (stateChanges.patchCount === 0) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-green-300">💾 State</span>
          <span className="text-xs text-slate-400">No changes</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/50 bg-green-950/20 overflow-hidden">
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-green-300">💾 State</span>
          <span className="text-xs text-slate-200">{stateChanges.patchCount} patches</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-2">
          {/* Modified paths */}
          <div>
            <div className="text-[10px] font-medium text-slate-400 mb-1">Modified Slices</div>
            <div className="flex flex-wrap gap-1">
              {stateChanges.modifiedPaths.map((path) => (
                <span
                  key={path}
                  className="text-[10px] font-mono bg-green-900/30 text-green-300 rounded px-1.5 py-0.5"
                >
                  {path}
                </span>
              ))}
            </div>
          </div>

          {/* Show patches toggle */}
          {stateChanges.patches && stateChanges.patches.length > 0 && (
            <>
              <button
                type="button"
                className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                onClick={() => setShowPatches((p) => !p)}
              >
                {showPatches ? 'Hide patches' : 'Show patches'}
              </button>

              {showPatches && (
                <div className="space-y-1">
                  {stateChanges.patches.map((patch, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono bg-slate-950/50 rounded p-1.5 overflow-x-auto"
                    >
                      <span
                        className={`${patch.op === 'add' ? 'text-green-400' : patch.op === 'remove' ? 'text-red-400' : 'text-yellow-400'}`}
                      >
                        {patch.op}
                      </span>{' '}
                      <span className="text-slate-300">{patch.path}</span>
                      {patch.value !== undefined && (
                        <div className="text-slate-400 mt-0.5 pl-2 truncate">
                          = {JSON.stringify(patch.value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NPC Agents Section
// =============================================================================

interface NpcAgentsSectionProps {
  agentsInvoked: string[];
  agentOutputs?: AgentOutputWithType[] | undefined;
}

const NpcAgentsSection: React.FC<NpcAgentsSectionProps> = ({ agentsInvoked, agentOutputs }) => {
  const [expanded, setExpanded] = useState(true);
  const [showNarratives, setShowNarratives] = useState<Record<number, boolean>>({});

  const npcOutputs = agentOutputs?.filter((o) => o.agentType === 'npc') ?? [];
  const otherAgents = agentsInvoked.filter((a) => a !== 'npc');

  return (
    <div className="rounded-lg border border-slate-700/50 bg-violet-950/20 overflow-hidden">
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-violet-300">🤖 Agents</span>
          <span className="text-xs text-slate-200">{agentsInvoked.length} invoked</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-2">
          {/* Agent badges */}
          <div className="flex flex-wrap gap-1">
            {agentsInvoked.map((agent) => {
              const config = AGENT_CONFIG[agent] ?? AGENT_CONFIG['custom'];
              if (!config) return null;
              return (
                <span
                  key={agent}
                  className={`text-[10px] font-mono ${config.bgColor} ${config.color} rounded px-1.5 py-0.5`}
                >
                  {config.label}
                </span>
              );
            })}
          </div>

          {/* NPC outputs */}
          {npcOutputs.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-slate-400">NPC Agent Outputs</div>
              {npcOutputs.map((out, idx) => {
                const diag = out.output.diagnostics;
                const npcId =
                  typeof diag?.debug?.['npcId'] === 'string' ? diag.debug['npcId'] : null;
                const execTime = diag?.executionTimeMs;

                return (
                  <div
                    key={idx}
                    className="rounded border border-slate-700/40 bg-slate-900/50 p-2 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {npcId && (
                          <span className="text-xs text-violet-400 font-mono">[{npcId}]</span>
                        )}
                        {execTime !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            {execTime.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-[10px] text-slate-400 hover:text-slate-200"
                        onClick={() =>
                          setShowNarratives((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                      >
                        {showNarratives[idx] ? 'Hide' : 'Show'} narrative
                      </button>
                    </div>

                    {/* Token usage */}
                    {diag?.tokenUsage && (
                      <div className="text-[10px] text-slate-500">
                        Tokens: {diag.tokenUsage.prompt}p / {diag.tokenUsage.completion}c
                      </div>
                    )}

                    {/* Narrative preview */}
                    {showNarratives[idx] && out.output.narrative && (
                      <div className="text-xs text-slate-300 bg-slate-950/50 rounded p-2 max-h-32 overflow-y-auto">
                        {out.output.narrative}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Other agent summary */}
          {otherAgents.length > 0 && npcOutputs.length === 0 && (
            <div className="text-[10px] text-slate-400 italic">
              {otherAgents.join(', ')} agent(s) invoked
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Timing Section
// =============================================================================

interface TimingSectionProps {
  timing: PhaseTiming;
  totalMs: number;
}

const TimingSection: React.FC<TimingSectionProps> = ({ timing, totalMs }) => {
  const phases = [
    { key: 'contextRetrievalMs', label: 'Context', color: 'bg-blue-500' },
    { key: 'agentExecutionMs', label: 'Execution', color: 'bg-violet-500' },
    { key: 'stateUpdateMs', label: 'State', color: 'bg-green-500' },
  ] as const;

  const knownMs = phases.reduce((sum, p) => sum + (timing[p.key] ?? 0), 0);
  const otherMs = Math.max(0, totalMs - knownMs);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">⏱️ Timing</span>
        <span className="text-xs text-slate-400">{totalMs.toFixed(0)}ms</span>
      </div>

      {/* Bar visualization */}
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
        {phases.map(({ key, color }) => {
          const ms = timing[key] ?? 0;
          const pct = totalMs > 0 ? (ms / totalMs) * 100 : 0;
          if (pct < 1) return null;
          return <div key={key} className={`${color}`} style={{ width: `${pct}%` }} />;
        })}
        {otherMs > 0 && totalMs > 0 && (
          <div className="bg-slate-600" style={{ width: `${(otherMs / totalMs) * 100}%` }} />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {phases.map(({ key, label, color }) => {
          const ms = timing[key];
          if (ms === undefined) return null;
          return (
            <span key={key} className="flex items-center gap-1 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}: {ms.toFixed(0)}ms
            </span>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// Main Debug Sidebar
// =============================================================================

export const DebugSidebar: React.FC<DebugSidebarProps> = ({ metadata, events, stateChanges }) => {
  const hasData = !!metadata || (!!events && events.length > 0) || !!stateChanges;

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-200">Debug Panel</h2>
        <p className="text-xs text-slate-400 mt-0.5">Last turn activity</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {!hasData ? (
          <p className="text-xs text-slate-500 italic text-center py-4">
            No turn data yet. Send a message to see debug info.
          </p>
        ) : (
          <>
            {/* Timing */}
            {metadata?.phaseTiming && (
              <TimingSection timing={metadata.phaseTiming} totalMs={metadata.processingTimeMs} />
            )}

            {/* Tool Calls */}
            {events && <ToolCallsSection events={events} />}

            {/* State Changes */}
            {stateChanges && <StateChangesSection stateChanges={stateChanges} />}

            {/* Agents */}
            {metadata && (
              <NpcAgentsSection
                agentsInvoked={metadata.agentsInvoked}
                agentOutputs={metadata.agentOutputs}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Also export the old component name for backward compatibility
export { DebugSidebar as AgentDebugSidebar };

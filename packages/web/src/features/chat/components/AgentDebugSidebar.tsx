import React, { useState } from 'react';
import type {
  TurnMetadata,
  AgentType,
  AgentOutputWithType,
  PhaseTiming,
  IntentDetectionDebug,
  DetectedIntent,
} from '../../../types.js';

// All known agent types in the system
const ALL_AGENT_TYPES: AgentType[] = ['map', 'npc', 'rules', 'parser', 'sensory'];

// Agent display configuration
const AGENT_CONFIG: Record<
  AgentType,
  { label: string; description: string; color: string; bgColor: string }
> = {
  map: {
    label: 'Map Agent',
    description: 'Handles movement, navigation, and location descriptions',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-950/40',
  },
  npc: {
    label: 'NPC Agent',
    description: 'Generates NPC dialogue and reactions',
    color: 'text-violet-300',
    bgColor: 'bg-violet-950/40',
  },
  rules: {
    label: 'Rules Agent',
    description: 'Enforces game mechanics and validates actions',
    color: 'text-amber-300',
    bgColor: 'bg-amber-950/40',
  },
  parser: {
    label: 'Parser Agent',
    description: 'Parses and interprets player input',
    color: 'text-sky-300',
    bgColor: 'bg-sky-950/40',
  },
  sensory: {
    label: 'Sensory Agent',
    description: 'Handles smell, touch, taste, and listen intents',
    color: 'text-pink-300',
    bgColor: 'bg-pink-950/40',
  },
  custom: {
    label: 'Custom Agent',
    description: 'Custom or specialized agent',
    color: 'text-slate-300',
    bgColor: 'bg-slate-800/40',
  },
};

interface AgentCardProps {
  agentType: AgentType;
  outputs: AgentOutputWithType[];
  invoked: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agentType, outputs, invoked }) => {
  const [expanded, setExpanded] = useState(false);
  const config = AGENT_CONFIG[agentType] ?? AGENT_CONFIG.custom;

  const hasOutputs = outputs.length > 0;

  return (
    <div
      className={`rounded-lg border border-slate-700/50 ${config.bgColor} overflow-hidden transition-all`}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${invoked ? 'bg-green-400' : 'bg-slate-600'}`}
            title={invoked ? 'Invoked this turn' : 'Not invoked'}
          />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasOutputs && <span className="text-xs text-slate-400">{outputs.length} output(s)</span>}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-3">
          <p className="text-xs text-slate-400">{config.description}</p>

          {!invoked && <p className="text-xs italic text-slate-500">Not invoked this turn</p>}

          {hasOutputs &&
            outputs.map((out, idx) => (
              <AgentOutputCard
                key={idx}
                output={out}
                index={idx}
                totalCount={outputs.length}
                agentType={agentType}
              />
            ))}
        </div>
      )}
    </div>
  );
};

interface AgentOutputCardProps {
  output: AgentOutputWithType;
  index: number;
  totalCount: number;
  agentType: AgentType;
}

const AgentOutputCard: React.FC<AgentOutputCardProps> = ({ output, index, totalCount }) => {
  const [showRaw, setShowRaw] = useState(false);
  const { output: agentOutput } = output;

  const diagnostics = agentOutput.diagnostics;
  const execTime = diagnostics?.executionTimeMs;
  const warnings = diagnostics?.warnings;
  const tokenUsage = diagnostics?.tokenUsage;

  // Extract NPC ID if present in debug info
  const npcId =
    typeof diagnostics?.debug?.['npcId'] === 'string' ? diagnostics.debug['npcId'] : null;

  return (
    <div className="rounded border border-slate-700/40 bg-slate-900/50 p-2 space-y-2">
      {/* Output header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {totalCount > 1 && <span className="text-xs text-slate-500">#{index + 1}</span>}
          {npcId && <span className="text-xs text-violet-400 font-mono">[{npcId}]</span>}
          {execTime !== undefined && (
            <span className="text-xs text-slate-400">{execTime.toFixed(0)}ms</span>
          )}
        </div>
        <button
          type="button"
          className="text-[10px] text-slate-400 hover:text-slate-200"
          onClick={() => setShowRaw((p) => !p)}
        >
          {showRaw ? 'Hide Raw' : 'Show Raw'}
        </button>
      </div>

      {/* Narrative */}
      {agentOutput.narrative && (
        <div className="text-sm text-slate-200 leading-relaxed">{agentOutput.narrative}</div>
      )}

      {/* Token usage */}
      {tokenUsage && (
        <div className="text-[10px] text-slate-500">
          Tokens: {tokenUsage.prompt}p / {tokenUsage.completion}c = {tokenUsage.total} total
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-400">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* State patches preview */}
      {agentOutput.statePatches && agentOutput.statePatches.length > 0 && (
        <div className="text-[10px] text-slate-400">
          {agentOutput.statePatches.length} state patch(es)
        </div>
      )}

      {/* Events preview */}
      {agentOutput.events && agentOutput.events.length > 0 && (
        <div className="text-[10px] text-slate-400">
          Events: {agentOutput.events.map((e) => e.type).join(', ')}
        </div>
      )}

      {/* Raw JSON */}
      {showRaw && (
        <pre className="text-[10px] text-slate-400 bg-slate-950/50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(agentOutput, null, 2)}
        </pre>
      )}
    </div>
  );
};

interface RoutingDetailProps {
  agentsInvoked: AgentType[];
  intent: DetectedIntent;
}

const RoutingDetail: React.FC<RoutingDetailProps> = ({ agentsInvoked, intent }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-orange-300">Routing</span>
          <span className="text-sm text-slate-200">{agentsInvoked.length} agent(s)</span>
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

      {/* Collapsed summary */}
      {!expanded && agentsInvoked.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-[10px] text-slate-400">
            {agentsInvoked.map((a) => AGENT_CONFIG[a]?.label ?? a).join(' → ')}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-3">
          {/* Intent to Agent mapping */}
          <div>
            <div className="text-[10px] font-medium text-slate-400 mb-1">Intent → Agent Flow</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-emerald-950/50 text-emerald-300 rounded px-2 py-0.5">
                {intent.type}
              </span>
              <span className="text-slate-500">→</span>
              {agentsInvoked.length === 0 ? (
                <span className="text-xs text-amber-400 italic">No agents matched</span>
              ) : (
                agentsInvoked.map((agent, i) => {
                  const config = AGENT_CONFIG[agent] ?? AGENT_CONFIG.custom;
                  return (
                    <span key={agent} className="flex items-center gap-1">
                      {i > 0 && <span className="text-slate-500">+</span>}
                      <span
                        className={`text-xs font-mono ${config.bgColor} ${config.color} rounded px-2 py-0.5`}
                      >
                        {agent}
                      </span>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Segments routing (for compound intents) */}
          {intent.segments && intent.segments.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-slate-400 mb-1">
                Segment Routing ({intent.segments.length} segments)
              </div>
              <div className="space-y-1">
                {intent.segments.map((seg, i) => {
                  // Determine which agent handles each segment type
                  let targetAgent: AgentType = 'parser';
                  if (seg.type === 'talk') targetAgent = 'npc';
                  if (seg.type === 'action') targetAgent = 'rules';
                  if (seg.type === 'sensory') targetAgent = 'sensory';
                  const config = AGENT_CONFIG[targetAgent] ?? AGENT_CONFIG.custom;

                  return (
                    <div key={i} className="text-xs flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{seg.type}</span>
                      {seg.sensoryType && (
                        <span className="text-pink-400">({seg.sensoryType})</span>
                      )}
                      <span className="text-slate-500">→</span>
                      <span
                        className={`font-mono ${config.bgColor} ${config.color} rounded px-1.5 py-0.5`}
                      >
                        {targetAgent}
                      </span>
                      {seg.bodyPart && (
                        <span className="text-amber-400 text-[10px]">[{seg.bodyPart}]</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="text-[10px] text-slate-500 italic">
            Agents are selected based on intent type. Compound intents route segments to multiple
            agents.
          </div>
        </div>
      )}
    </div>
  );
};

interface TimingSummaryProps {
  timing: PhaseTiming;
  totalMs: number;
}

const TimingSummary: React.FC<TimingSummaryProps> = ({ timing, totalMs }) => {
  const phases = [
    { key: 'intentDetectionMs', label: 'Intent' },
    { key: 'stateRecallMs', label: 'State' },
    { key: 'contextRetrievalMs', label: 'Retrieval' },
    { key: 'agentRoutingMs', label: 'Routing' },
    { key: 'agentExecutionMs', label: 'Execution' },
    { key: 'stateUpdateMs', label: 'Update' },
    { key: 'responseAggregationMs', label: 'Response' },
  ] as const;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300">Phase Timing</span>
        <span className="text-xs text-slate-400">{totalMs.toFixed(0)}ms total</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {phases.map(({ key, label }) => {
          const value = timing[key];
          if (value === undefined) return null;
          return (
            <span
              key={key}
              className="text-[10px] text-slate-400 bg-slate-800/50 rounded px-1.5 py-0.5"
            >
              {label}: {value.toFixed(0)}ms
            </span>
          );
        })}
      </div>
    </div>
  );
};

interface IntentDetailProps {
  intent: DetectedIntent;
  intentDebug?: IntentDetectionDebug | undefined;
}

const IntentDetail: React.FC<IntentDetailProps> = ({ intent, intentDebug }) => {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showParsed, setShowParsed] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-emerald-300">Intent</span>
          <span className="text-sm text-slate-200 font-mono">{intent.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {(intent.confidence * 100).toFixed(0)}% confidence
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsed summary - params */}
      {!expanded && intent.params && Object.keys(intent.params).length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-[10px] text-slate-400">
            {Object.entries(intent.params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(', ')}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700/50 space-y-3">
          {/* LLM Reasoning (if debug mode enabled) */}
          {(() => {
            const parsed = intentDebug?.parsed;
            if (parsed && typeof parsed === 'object' && parsed !== null) {
              const rec = parsed as Record<string, unknown>;
              if ('reasoning' in rec && typeof rec['reasoning'] === 'string') {
                return (
                  <div>
                    <div className="text-[10px] font-medium text-cyan-400 mb-1">
                      🧠 LLM Reasoning
                    </div>
                    <div className="text-xs text-slate-300 bg-cyan-950/30 border border-cyan-800/50 rounded p-2 italic">
                      {rec['reasoning']}
                    </div>
                  </div>
                );
              }
            }
            return null;
          })()}

          {/* Params */}
          {intent.params && Object.keys(intent.params).length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-slate-400 mb-1">Parameters</div>
              <div className="text-xs text-slate-300 font-mono bg-slate-800/50 rounded p-2">
                {JSON.stringify(intent.params, null, 2)}
              </div>
            </div>
          )}

          {/* Segments / Intents */}
          {intent.segments && intent.segments.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-slate-400 mb-1">
                Detected Segments ({intent.segments.length})
              </div>
              <div className="space-y-1">
                {intent.segments.map((seg, i) => (
                  <div key={i} className="text-xs bg-slate-800/50 rounded p-2">
                    <span className="text-emerald-400 font-mono">{seg.type}</span>
                    {seg.sensoryType && (
                      <span className="text-pink-400 ml-1">({seg.sensoryType})</span>
                    )}
                    {seg.bodyPart && <span className="text-amber-400 ml-1">[{seg.bodyPart}]</span>}
                    <div className="text-slate-300 mt-1 italic">"{seg.content}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug info */}
          {intentDebug && (
            <>
              {/* Model & detector */}
              <div className="text-[10px] text-slate-500">
                Detector: {intentDebug.detector}
                {intentDebug.model && ` | Model: ${intentDebug.model}`}
              </div>

              {/* Warnings */}
              {intentDebug.warnings && intentDebug.warnings.length > 0 && (
                <div className="space-y-1">
                  {intentDebug.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-400">
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Raw response toggle */}
              <div className="flex gap-2">
                {intentDebug.rawResponse && (
                  <button
                    type="button"
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                    onClick={() => setShowRaw((p) => !p)}
                  >
                    {showRaw ? 'Hide Raw Response' : 'Show Raw Response'}
                  </button>
                )}
                {intentDebug.parsed !== undefined && (
                  <button
                    type="button"
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                    onClick={() => setShowParsed((p) => !p)}
                  >
                    {showParsed ? 'Hide Parsed' : 'Show Parsed'}
                  </button>
                )}
              </div>

              {/* Raw response */}
              {showRaw && intentDebug.rawResponse && (
                <div>
                  <div className="text-[10px] font-medium text-slate-400 mb-1">
                    LLM Raw Response
                  </div>
                  <pre className="text-[10px] text-slate-300 bg-slate-950/50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {intentDebug.rawResponse}
                  </pre>
                </div>
              )}

              {/* Parsed JSON */}
              {showParsed && intentDebug.parsed !== undefined && (
                <div>
                  <div className="text-[10px] font-medium text-slate-400 mb-1">Parsed Intent</div>
                  <pre className="text-[10px] text-slate-300 bg-slate-950/50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(intentDebug.parsed as object, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export interface AgentDebugSidebarProps {
  metadata: TurnMetadata | null;
}

export const AgentDebugSidebar: React.FC<AgentDebugSidebarProps> = ({ metadata }) => {
  // Group outputs by agent type
  const outputsByAgent = React.useMemo(() => {
    const map = new Map<AgentType, AgentOutputWithType[]>();
    ALL_AGENT_TYPES.forEach((type) => map.set(type, []));

    if (metadata?.agentOutputs) {
      for (const out of metadata.agentOutputs) {
        const existing = map.get(out.agentType) ?? [];
        existing.push(out);
        map.set(out.agentType, existing);
      }
    }

    return map;
  }, [metadata?.agentOutputs]);

  const invokedAgents = new Set(metadata?.agentsInvoked ?? []);

  return (
    <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200">Agent Debug</h2>
        <p className="text-xs text-slate-400 mt-0.5">Last turn agent activity</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {!metadata ? (
          <p className="text-xs text-slate-500 italic text-center py-4">
            No turn data yet. Send a message to see agent activity.
          </p>
        ) : (
          <>
            {/* Timing Summary */}
            {metadata.phaseTiming && (
              <TimingSummary timing={metadata.phaseTiming} totalMs={metadata.processingTimeMs} />
            )}

            {/* Intent Detail */}
            {metadata.intent && (
              <IntentDetail intent={metadata.intent} intentDebug={metadata.intentDebug} />
            )}

            {/* Routing Detail */}
            {metadata.intent && (
              <RoutingDetail agentsInvoked={metadata.agentsInvoked} intent={metadata.intent} />
            )}

            {/* Agent Cards */}
            {ALL_AGENT_TYPES.map((agentType) => (
              <AgentCard
                key={agentType}
                agentType={agentType}
                outputs={outputsByAgent.get(agentType) ?? []}
                invoked={invokedAgents.has(agentType)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

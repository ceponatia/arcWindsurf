/**
 * RelationshipsStep Component
 * Configure initial relationships between player and NPCs.
 */
import { useState, useMemo } from 'react';
import { useWorkspaceStore, useNpcsState } from '../store.js';
import type { RelationshipConfig, NpcSessionConfig } from '../store.js';
import type { CharacterSummary } from '../../../types.js';
import { Users, Plus, X, AlertCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';

/**
 * Common relationship presets
 */
const RELATIONSHIP_PRESETS = [
  { value: 'stranger', label: 'Stranger', affinity: { trust: 0.5, fondness: 0.5, fear: 0.2 } },
  {
    value: 'acquaintance',
    label: 'Acquaintance',
    affinity: { trust: 0.55, fondness: 0.55, fear: 0.15 },
  },
  { value: 'friend', label: 'Friend', affinity: { trust: 0.7, fondness: 0.75, fear: 0.1 } },
  {
    value: 'close_friend',
    label: 'Close Friend',
    affinity: { trust: 0.85, fondness: 0.85, fear: 0.05 },
  },
  { value: 'rival', label: 'Rival', affinity: { trust: 0.3, fondness: 0.3, fear: 0.4 } },
  { value: 'enemy', label: 'Enemy', affinity: { trust: 0.1, fondness: 0.15, fear: 0.6 } },
  { value: 'colleague', label: 'Colleague', affinity: { trust: 0.6, fondness: 0.5, fear: 0.15 } },
  { value: 'family', label: 'Family', affinity: { trust: 0.8, fondness: 0.8, fear: 0.1 } },
  {
    value: 'romantic',
    label: 'Romantic Partner',
    affinity: { trust: 0.9, fondness: 0.95, fear: 0.05 },
  },
  { value: 'mentor', label: 'Mentor', affinity: { trust: 0.75, fondness: 0.65, fear: 0.15 } },
  { value: 'student', label: 'Student', affinity: { trust: 0.6, fondness: 0.6, fear: 0.2 } },
] as const;

/**
 * Inverse relationship mapping for symmetric updates
 */
const RELATIONSHIP_INVERSES: Record<string, string> = {
  stranger: 'stranger',
  acquaintance: 'acquaintance',
  friend: 'friend',
  close_friend: 'close_friend',
  rival: 'rival',
  enemy: 'enemy',
  colleague: 'colleague',
  family: 'family',
  romantic: 'romantic',
  mentor: 'student',
  student: 'mentor',
};

interface RelationshipsStepProps {
  characters: CharacterSummary[];
}

/** Get character name by ID */
function getCharacterName(
  characters: CharacterSummary[],
  npcs: NpcSessionConfig[],
  actorId: string
): string {
  if (actorId === 'player') return 'Player';
  const char = characters.find((c) => c.id === actorId);
  if (char) return char.name;
  const npc = npcs.find((n) => n.characterId === actorId);
  if (npc?.label) return npc.label;
  return 'Unknown';
}

/** Relationship Matrix for small casts */
interface MatrixViewProps {
  actorIds: string[];
  characters: CharacterSummary[];
  npcs: NpcSessionConfig[];
  relationships: RelationshipConfig[];
  onUpdate: (
    fromId: string,
    toId: string,
    type: string,
    affinity?: RelationshipConfig['affinitySeed']
  ) => void;
}

function MatrixView({ actorIds, characters, npcs, relationships, onUpdate }: MatrixViewProps) {
  const getRelationship = (fromId: string, toId: string): RelationshipConfig | undefined => {
    return relationships.find((r) => r.fromActorId === fromId && r.toActorId === toId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 border border-slate-700 bg-slate-800/50 text-slate-300 text-left">
              From / To
            </th>
            {actorIds.map((id) => (
              <th
                key={id}
                className="p-2 border border-slate-700 bg-slate-800/50 text-slate-300 text-center min-w-[100px]"
              >
                {getCharacterName(characters, npcs, id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {actorIds.map((fromId) => (
            <tr key={fromId}>
              <td className="p-2 border border-slate-700 bg-slate-800/30 text-slate-300 font-medium">
                {getCharacterName(characters, npcs, fromId)}
              </td>
              {actorIds.map((toId, colIndex) => {
                const rowIndex = actorIds.indexOf(fromId);

                if (fromId === toId) {
                  return (
                    <td
                      key={toId}
                      className="p-2 border border-slate-700 bg-slate-900/50 text-center text-slate-600"
                    >
                      -
                    </td>
                  );
                }

                const rel = getRelationship(fromId, toId);
                const isUpperTriangle = rowIndex < colIndex;

                if (isUpperTriangle) {
                  return (
                    <td key={toId} className="p-2 border border-slate-700 bg-slate-900/30">
                      <select
                        value={rel?.relationshipType ?? 'stranger'}
                        onChange={(e) => {
                          const preset = RELATIONSHIP_PRESETS.find(
                            (p) => p.value === e.target.value
                          );
                          onUpdate(fromId, toId, e.target.value, preset?.affinity);
                        }}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs focus:ring-1 focus:ring-violet-500"
                      >
                        {RELATIONSHIP_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                }

                // Lower triangle - read only reflection
                const preset = RELATIONSHIP_PRESETS.find(
                  (p) => p.value === (rel?.relationshipType ?? 'stranger')
                );
                return (
                  <td
                    key={toId}
                    className="p-2 border border-slate-700 bg-slate-900/20 text-center"
                  >
                    <span className="text-xs text-slate-500 italic">
                      {preset?.label ?? 'Stranger'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Relationship List for larger casts */
interface ListViewProps {
  actorIds: string[];
  characters: CharacterSummary[];
  npcs: NpcSessionConfig[];
  relationships: RelationshipConfig[];
  onUpdate: (
    fromId: string,
    toId: string,
    type: string,
    affinity?: RelationshipConfig['affinitySeed']
  ) => void;
  onRemove: (fromId: string, toId: string) => void;
}

function ListView({
  actorIds,
  characters,
  npcs,
  relationships,
  onUpdate,
  onRemove,
}: ListViewProps) {
  const [expandedActors, setExpandedActors] = useState<Set<string>>(new Set(['player']));
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const toggleExpanded = (actorId: string) => {
    setExpandedActors((prev) => {
      const next = new Set(prev);
      if (next.has(actorId)) {
        next.delete(actorId);
      } else {
        next.add(actorId);
      }
      return next;
    });
  };

  const getRelationshipsFrom = (fromId: string): RelationshipConfig[] => {
    return relationships.filter((r) => r.fromActorId === fromId);
  };

  const getAvailableTargets = (fromId: string): string[] => {
    const existing = new Set(getRelationshipsFrom(fromId).map((r) => r.toActorId));
    return actorIds.filter((id) => id !== fromId && !existing.has(id));
  };

  return (
    <div className="space-y-3">
      {actorIds.map((actorId) => {
        const isExpanded = expandedActors.has(actorId);
        const actorRelationships = getRelationshipsFrom(actorId);
        const availableTargets = getAvailableTargets(actorId);

        return (
          <div
            key={actorId}
            className="border border-slate-700 rounded-lg bg-slate-900/30 overflow-hidden"
          >
            {/* Actor header */}
            <button
              onClick={() => {
                toggleExpanded(actorId);
              }}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-200">
                  {getCharacterName(characters, npcs, actorId)}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {actorRelationships.length} relationship{actorRelationships.length !== 1 ? 's' : ''}
              </span>
            </button>

            {/* Relationships */}
            {isExpanded && (
              <div className="p-4 space-y-2">
                {actorRelationships.length === 0 && availableTargets.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    No relationships configured
                  </p>
                )}

                {actorRelationships.map((rel) => (
                  <div
                    key={`${rel.fromActorId}-${rel.toActorId}`}
                    className="flex items-center gap-3 p-2 bg-slate-800/30 rounded"
                  >
                    <span className="text-sm text-slate-300 flex-1">
                      → {getCharacterName(characters, npcs, rel.toActorId)}
                    </span>
                    <select
                      value={rel.relationshipType}
                      onChange={(e) => {
                        const preset = RELATIONSHIP_PRESETS.find((p) => p.value === e.target.value);
                        onUpdate(actorId, rel.toActorId, e.target.value, preset?.affinity);
                      }}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                    >
                      {RELATIONSHIP_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        onRemove(actorId, rel.toActorId);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove relationship"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add relationship button */}
                {availableTargets.length > 0 && (
                  <>
                    {addingFor === actorId ? (
                      <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const preset = RELATIONSHIP_PRESETS[0];
                              onUpdate(actorId, e.target.value, preset.value, preset.affinity);
                              setAddingFor(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                        >
                          <option value="">Select character...</option>
                          {availableTargets.map((targetId) => (
                            <option key={targetId} value={targetId}>
                              {getCharacterName(characters, npcs, targetId)}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setAddingFor(null);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingFor(actorId);
                        }}
                        className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 px-2 py-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add relationship
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RelationshipsStep({ characters }: RelationshipsStepProps) {
  const npcs = useNpcsState();
  const { relationships, addRelationship, updateRelationship, removeRelationship, setStep } =
    useWorkspaceStore();
  const [viewMode, setViewMode] = useState<'auto' | 'matrix' | 'list'>('auto');
  const [showLegend, setShowLegend] = useState(false);

  // Build actor IDs list: player + all NPC character IDs
  const actorIds = useMemo(() => {
    return ['player', ...npcs.map((n: NpcSessionConfig) => n.characterId)];
  }, [npcs]);

  // Auto-select view based on cast size
  const effectiveView = useMemo(() => {
    if (viewMode !== 'auto') return viewMode;
    return actorIds.length <= 6 ? 'matrix' : 'list';
  }, [viewMode, actorIds.length]);

  // Handle relationship updates
  const handleUpdate = (
    fromId: string,
    toId: string,
    type: string,
    affinity?: RelationshipConfig['affinitySeed']
  ) => {
    const existing = relationships.find((r) => r.fromActorId === fromId && r.toActorId === toId);

    if (existing) {
      updateRelationship(fromId, toId, {
        relationshipType: type,
        ...(affinity ? { affinitySeed: affinity } : {}),
      });
    } else {
      addRelationship({
        fromActorId: fromId,
        toActorId: toId,
        relationshipType: type,
        ...(affinity ? { affinitySeed: affinity } : {}),
      });
    }
  };

  // Handle symmetric relationship updates (for Matrix view)
  const handleSymmetricUpdate = (
    fromId: string,
    toId: string,
    type: string,
    affinity?: RelationshipConfig['affinitySeed']
  ) => {
    // Update forward relationship
    handleUpdate(fromId, toId, type, affinity);

    // Update reverse relationship with inverse type
    const inverseEntry = Object.getOwnPropertyDescriptor(RELATIONSHIP_INVERSES, type);
    const inverseType = typeof inverseEntry?.value === 'string' ? inverseEntry.value : type;
    const inversePreset = RELATIONSHIP_PRESETS.find((p) => p.value === inverseType);
    handleUpdate(toId, fromId, inverseType, inversePreset?.affinity);
  };

  // Handle removal
  const handleRemove = (fromId: string, toId: string) => {
    removeRelationship(fromId, toId);
  };

  // Empty state - no NPCs
  if (npcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Users className="h-12 w-12 mb-4 text-slate-600" />
        <p className="text-lg mb-2">No NPCs selected</p>
        <p className="text-sm mb-4">Add NPCs in the previous step to configure relationships.</p>
        <button
          onClick={() => setStep('npcs')}
          className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-500 transition-colors"
        >
          Go to NPCs Step
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Relationships</h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure initial relationships between the player and NPCs
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend Toggle */}
          <button
            onClick={() => {
              setShowLegend(!showLegend);
            }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              showLegend
                ? 'bg-violet-900/50 text-violet-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Legend
          </button>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">View:</span>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as 'auto' | 'matrix' | 'list');
              }}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs"
            >
              <option value="auto">Auto ({actorIds.length <= 6 ? 'Matrix' : 'List'})</option>
              <option value="matrix">Matrix</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend Panel */}
      {showLegend && (
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-slate-300 mb-2">Matrix View</h4>
            <p className="text-xs mb-2">
              The matrix shows relationships between all characters. The upper triangle (editable)
              represents the relationship from the row character to the column character. The lower
              triangle (read-only) shows the inverse relationship.
            </p>
            <p className="text-xs text-slate-500">
              Example: Setting "Friend" for A → B automatically sets "Friend" for B → A.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-300 mb-2">Relationship Types</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {RELATIONSHIP_PRESETS.slice(0, 6).map((p) => (
                <div key={p.value}>
                  <span className="font-medium text-slate-300">{p.label}</span>: Trust{' '}
                  {p.affinity.trust}, Fondness {p.affinity.fondness}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info callout */}
      {!showLegend && (
        <div className="flex items-start gap-3 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-400">
            <p>
              Relationships define how characters know each other at the start of the session. Each
              relationship has an affinity seed (trust, fondness, fear) that influences initial
              interactions.
            </p>
            <p className="mt-2 text-slate-500">
              By default, all relationships start as "Stranger" with neutral affinity.
            </p>
          </div>
        </div>
      )}

      {/* Matrix or List view */}
      {effectiveView === 'matrix' ? (
        <MatrixView
          actorIds={actorIds}
          characters={characters}
          npcs={npcs}
          relationships={relationships}
          onUpdate={handleSymmetricUpdate}
        />
      ) : (
        <ListView
          actorIds={actorIds}
          characters={characters}
          npcs={npcs}
          relationships={relationships}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      )}

      {/* Summary */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {relationships.length} relationship{relationships.length !== 1 ? 's' : ''} configured
          </span>
          <span className="text-slate-500">
            Possible: {actorIds.length * (actorIds.length - 1)} (bidirectional pairs)
          </span>
        </div>
      </div>
    </div>
  );
}

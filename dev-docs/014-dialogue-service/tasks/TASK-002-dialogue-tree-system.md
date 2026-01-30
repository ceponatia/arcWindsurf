# TASK-002: Implement Dialogue Tree System

**Priority**: P2
**Status**: ✅ Complete
**Estimate**: 12-20 hours
**Depends On**: TASK-001 (LLM base)
**Category**: Dialogue Service

---

## Objective

Add a dialogue tree system for scripted conversations that can be authored for key story moments, quest triggers, and important lore reveals.

## Schema Design

### Dialogue Node

```typescript
interface DialogueNode {
  id: string;
  npcLine: string;
  /** Voice/tone hint for narrator */
  tone?: 'neutral' | 'angry' | 'happy' | 'sad' | 'mysterious';
  /** Conditions that must be true to show this node */
  conditions?: DialogueCondition[];
  /** Player response options */
  options: DialogueOption[];
  /** Actions to execute when this node is reached */
  onEnter?: DialogueEffect[];
}

interface DialogueOption {
  id: string;
  playerText: string;
  /** Next node ID, or null to end conversation */
  nextNodeId: string | null;
  /** Conditions to show this option */
  conditions?: DialogueCondition[];
  /** Effects when player selects this option */
  effects?: DialogueEffect[];
  /** Hint text shown on hover */
  hint?: string;
}
```

### Conditions

```typescript
type DialogueCondition =
  | { type: 'relationship'; factionId?: string; min?: number; max?: number }
  | { type: 'quest'; questId: string; status: 'not_started' | 'active' | 'complete' }
  | { type: 'item'; itemId: string; has: boolean }
  | { type: 'flag'; flagId: string; value: boolean }
  | { type: 'time'; after?: number; before?: number }
  | { type: 'custom'; evaluator: string };
```

### Effects

```typescript
type DialogueEffect =
  | { type: 'reputation'; factionId: string; delta: number }
  | { type: 'quest'; questId: string; action: 'start' | 'advance' | 'complete' }
  | { type: 'item'; itemId: string; action: 'give' | 'take'; quantity?: number }
  | { type: 'flag'; flagId: string; value: boolean }
  | { type: 'custom'; handler: string };
```

### Dialogue Tree

```typescript
interface DialogueTree {
  id: string;
  npcId: string;
  /** Topic/trigger that activates this tree */
  trigger: DialogueTrigger;
  /** Entry node ID */
  startNodeId: string;
  /** All nodes in this tree */
  nodes: Record<string, DialogueNode>;
}

type DialogueTrigger =
  | { type: 'keyword'; keywords: string[] }
  | { type: 'topic'; topic: string }
  | { type: 'greeting'; priority?: number }
  | { type: 'quest'; questId: string }
  | { type: 'item'; itemId: string };
```

## DB Tables

```sql
CREATE TABLE dialogue_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  start_node_id TEXT NOT NULL,
  nodes JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dialogue_trees_npc ON dialogue_trees(npc_id);

CREATE TABLE dialogue_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  npc_id TEXT NOT NULL,
  tree_id UUID REFERENCES dialogue_trees(id),
  current_node_id TEXT,
  visited_nodes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, npc_id)
);
```

## Resolution Engine

```typescript
class DialogueTreeResolver {
  /**
   * Find matching dialogue tree for input.
   */
  static async findTree(
    npcId: string,
    input: string,
    context: DialogueContext
  ): Promise<DialogueTree | null> {
    const trees = await getDialogueTrees(npcId);

    for (const tree of trees.sort((a, b) => b.priority - a.priority)) {
      if (this.matchesTrigger(tree.trigger, input, context)) {
        return tree;
      }
    }

    return null;
  }

  /**
   * Resolve current node and available options.
   */
  static async resolve(
    tree: DialogueTree,
    state: DialogueState,
    context: ConditionContext
  ): Promise<ResolvedDialogue> {
    const nodeId = state.currentNodeId ?? tree.startNodeId;
    const node = tree.nodes[nodeId];

    if (!node) {
      throw new Error(`Node ${nodeId} not found in tree ${tree.id}`);
    }

    // Filter options by conditions
    const availableOptions = node.options.filter(opt =>
      this.evaluateConditions(opt.conditions ?? [], context)
    );

    return {
      npcLine: node.npcLine,
      tone: node.tone,
      options: availableOptions.map(opt => ({
        id: opt.id,
        text: opt.playerText,
        hint: opt.hint,
      })),
    };
  }

  /**
   * Process player selection and advance state.
   */
  static async selectOption(
    tree: DialogueTree,
    state: DialogueState,
    optionId: string,
    context: ConditionContext
  ): Promise<{ nextNode: DialogueNode | null; effects: DialogueEffect[] }> {
    const currentNode = tree.nodes[state.currentNodeId ?? tree.startNodeId];
    const option = currentNode?.options.find(o => o.id === optionId);

    if (!option) {
      throw new Error(`Option ${optionId} not found`);
    }

    // Execute effects
    if (option.effects) {
      await this.executeEffects(option.effects, context);
    }

    // Advance state
    if (option.nextNodeId) {
      state.currentNodeId = option.nextNodeId;
      state.visitedNodes.push(option.nextNodeId);
      await updateDialogueState(state);

      const nextNode = tree.nodes[option.nextNodeId];
      if (nextNode?.onEnter) {
        await this.executeEffects(nextNode.onEnter, context);
      }

      return { nextNode, effects: option.effects ?? [] };
    }

    // Conversation ended
    await clearDialogueState(state.sessionId, state.npcId);
    return { nextNode: null, effects: option.effects ?? [] };
  }
}
```

## Integration with LLM Fallback

```typescript
// In DialogueService.resolveResponse
static async resolveResponse(
  actorId: string,
  context: DialogueContext,
  llmProvider: LLMProvider
): Promise<DialogueResponse> {
  // 1. Check for active dialogue tree
  const tree = await DialogueTreeResolver.findTree(
    actorId,
    context.history?.[context.history.length - 1] ?? '',
    context
  );

  if (tree) {
    // Use tree-based dialogue
    const state = await getOrCreateDialogueState(context.sessionId, actorId, tree.id);
    const resolved = await DialogueTreeResolver.resolve(tree, state, context);

    return {
      content: resolved.npcLine,
      options: resolved.options.map(o => o.text),
      treeId: tree.id,
      nodeId: state.currentNodeId,
    };
  }

  // 2. Fall back to LLM
  return this.resolveLLMResponse(actorId, context, llmProvider);
}
```

## Acceptance Criteria

- [x] Dialogue tree schema defined and validated
- [x] DB tables created with proper indexes
- [x] Tree resolution finds matching trees by trigger
- [x] Conditions evaluate correctly
- [x] Effects execute on option selection
- [x] State tracks current position in tree
- [x] Seamless fallback to LLM when no tree matches
- [x] Unit tests for resolver logic

## Notes

- Consider a visual editor for authoring trees (future task)
- Trees could be stored in YAML/JSON files for version control
- Add analytics to track which paths players take

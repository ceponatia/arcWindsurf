/**
 * Dialogue tree resolution and state advancement.
 */
import {
  DialogueConditionSchema,
  DialogueEffectSchema,
  DialogueStateSchema,
  DialogueTreeSchema,
  DialogueTriggerSchema,
} from '@minimal-rpg/schemas';
import type {
  DialogueCondition,
  DialogueEffect,
  DialogueNode,
  DialogueTree,
  DialogueTrigger,
} from '@minimal-rpg/schemas';
import { getRecordOptional } from '@minimal-rpg/schemas';
import {
  clearDialogueState,
  getDialogueTrees,
  updateDialogueState,
} from '@minimal-rpg/db';
import { FactionService } from './faction.js';
import type { DialogueContext } from './dialogue-types.js';
import type { DialogueConditionContext } from './dialogue-tree-types.js';

interface DialogueTreeRecord {
  id: string;
  npcId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  startNodeId: string;
  nodes: Record<string, unknown>;
  priority: number | null;
}

interface DialogueStateRecord {
  id: string;
  sessionId: string | null;
  npcId: string;
  treeId: string | null;
  currentNodeId: string | null;
  visitedNodes: string[];
}

/**
 * Resolved dialogue option for presentation.
 */
export interface ResolvedDialogueOption {
  id: string;
  text: string;
  hint: string | undefined;
}

/**
 * Resolved dialogue node payload.
 */
export interface ResolvedDialogue {
  npcLine: string;
  tone?: DialogueNode['tone'];
  options: ResolvedDialogueOption[];
}

/**
 * Dialogue tree resolver.
 */
export class DialogueTreeResolver {
  /**
   * Find a matching dialogue tree for input and context.
   */
  static async findTree(
    npcId: string,
    input: string,
    context: DialogueContext
  ): Promise<DialogueTree | null> {
    const trees = (await getDialogueTrees(npcId)) as unknown as DialogueTreeRecord[];
    const parsedTrees = this.parseDialogueTrees(trees);

    for (const entry of parsedTrees.sort((a, b) => b.priority - a.priority)) {
      const conditionContext =
        context.conditionContext as Partial<DialogueConditionContext> | undefined;
      if (this.matchesTrigger(entry.tree.trigger, input, context, conditionContext)) {
        return entry.tree;
      }
    }

    return null;
  }

  /**
   * Resolve the current node and available options.
   */
  static async resolve(
    tree: DialogueTree,
    state: DialogueStateRecord,
    context: DialogueConditionContext
  ): Promise<ResolvedDialogue> {
    const normalizedState = this.normalizeState(state, tree.id, context.sessionId);
    const nodeId = normalizedState.currentNodeId ?? tree.startNodeId;
    const node = getRecordOptional(tree.nodes, nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found in tree ${tree.id}`);
    }

    if (node.conditions && !(await this.evaluateConditions(node.conditions, context))) {
      throw new Error(`Conditions not met for node ${nodeId} in tree ${tree.id}`);
    }

    const resolvedOptions = await this.resolveOptions(node, context);

    return {
      npcLine: node.npcLine,
      tone: node.tone,
      options: resolvedOptions,
    };
  }

  /**
   * Process player selection and advance state.
   */
  static async selectOption(
    tree: DialogueTree,
    state: DialogueStateRecord,
    optionId: string,
    context: DialogueConditionContext
  ): Promise<{ nextNode: DialogueNode | null; effects: DialogueEffect[] }> {
    const normalizedState = this.normalizeState(state, tree.id, context.sessionId);
    const currentNode = tree.nodes[normalizedState.currentNodeId ?? tree.startNodeId];
    const option = currentNode?.options.find((opt) => opt.id === optionId);

    if (!option) {
      throw new Error(`Option ${optionId} not found`);
    }

    if (option.effects) {
      await this.executeEffects(option.effects, context);
    }

    if (option.nextNodeId) {
      normalizedState.currentNodeId = option.nextNodeId;
      if (!normalizedState.visitedNodes.includes(option.nextNodeId)) {
        normalizedState.visitedNodes.push(option.nextNodeId);
      }

      await updateDialogueState({
        id: normalizedState.id,
        currentNodeId: normalizedState.currentNodeId,
        visitedNodes: normalizedState.visitedNodes,
      });

      const nextNode = getRecordOptional(tree.nodes, option.nextNodeId);
      if (nextNode?.onEnter) {
        await this.executeEffects(nextNode.onEnter, context);
      }

      return { nextNode: nextNode ?? null, effects: option.effects ?? [] };
    }

    await clearDialogueState(context.sessionId, context.npcId);
    return { nextNode: null, effects: option.effects ?? [] };
  }

  /**
   * Normalize a dialogue state record into a validated state object.
   */
  static normalizeState(
    state: DialogueStateRecord,
    treeId: string,
    sessionId: string
  ): DialogueStateRecord {
    if (!state.sessionId) {
      throw new Error('Dialogue state missing session id');
    }
    if (!state.treeId) {
      throw new Error('Dialogue state missing tree id');
    }

    const parsed = DialogueStateSchema.parse({
      id: state.id,
      sessionId: state.sessionId ?? sessionId,
      npcId: state.npcId,
      treeId: state.treeId ?? treeId,
      currentNodeId: state.currentNodeId ?? null,
      visitedNodes: state.visitedNodes ?? [],
    });

    return {
      ...state,
      ...parsed,
    };
  }

  /**
   * Evaluate whether a trigger matches the input and context.
   */
  static matchesTrigger(
    trigger: DialogueTrigger,
    input: string,
    context: DialogueContext,
    conditionContext?: Partial<DialogueConditionContext>
  ): boolean {
    const trimmedInput = input.trim().toLowerCase();
    switch (trigger.type) {
      case 'keyword':
        return trigger.keywords.some((keyword) => trimmedInput.includes(keyword.toLowerCase()));
      case 'topic':
        return context.topic?.toLowerCase() === trigger.topic.toLowerCase();
      case 'greeting':
        return !trimmedInput || !context.history?.length;
      case 'quest':
        return conditionContext?.questStatus?.[trigger.questId] === 'active';
      case 'item':
        return (conditionContext?.itemCounts?.[trigger.itemId] ?? 0) > 0;
      default:
        return false;
    }
  }

  /**
   * Resolve available options for a node.
   */
  private static async resolveOptions(
    node: DialogueNode,
    context: DialogueConditionContext
  ): Promise<ResolvedDialogueOption[]> {
    const resolved = await Promise.all(
      node.options.map(async (opt) => {
        const allowed = await this.evaluateConditions(opt.conditions ?? [], context);
        return allowed
          ? {
            id: opt.id,
            text: opt.playerText,
            hint: opt.hint,
          }
          : null;
      })
    );

    return resolved.filter((opt): opt is ResolvedDialogueOption => opt !== null);
  }

  /**
   * Evaluate a list of conditions.
   */
  private static async evaluateConditions(
    conditions: DialogueCondition[],
    context: DialogueConditionContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const ok = await this.evaluateCondition(condition, context);
      if (!ok) return false;
    }

    return true;
  }

  /**
   * Evaluate a single condition.
   */
  private static async evaluateCondition(
    condition: DialogueCondition,
    context: DialogueConditionContext
  ): Promise<boolean> {
    const parsed = DialogueConditionSchema.parse(condition);

    switch (parsed.type) {
      case 'relationship': {
        const relationship =
          parsed.factionId && context.relationshipByFactionId
            ? context.relationshipByFactionId[parsed.factionId]
            : context.relationshipLevel;
        if (relationship === undefined) return false;
        if (parsed.min !== undefined && relationship < parsed.min) return false;
        if (parsed.max !== undefined && relationship > parsed.max) return false;
        return true;
      }
      case 'quest': {
        const status = context.questStatus?.[parsed.questId];
        return status === parsed.status;
      }
      case 'item': {
        const count = context.itemCounts?.[parsed.itemId] ?? 0;
        return parsed.has ? count > 0 : count <= 0;
      }
      case 'flag': {
        const value = context.flags?.[parsed.flagId];
        return value === parsed.value;
      }
      case 'time': {
        if (context.time === undefined) return false;
        if (parsed.after !== undefined && context.time < parsed.after) return false;
        if (parsed.before !== undefined && context.time > parsed.before) return false;
        return true;
      }
      case 'custom': {
        const evaluator = context.customConditionEvaluators?.[parsed.evaluator];
        if (!evaluator) return false;
        return await evaluator(context);
      }
      default:
        return false;
    }
  }

  /**
   * Execute effects for an option or node.
   */
  private static async executeEffects(
    effects: DialogueEffect[],
    context: DialogueConditionContext
  ): Promise<void> {
    for (const effect of effects) {
      await this.executeEffect(effect, context);
    }
  }

  /**
   * Execute a single dialogue effect.
   */
  private static async executeEffect(
    effect: DialogueEffect,
    context: DialogueConditionContext
  ): Promise<void> {
    const parsed = DialogueEffectSchema.parse(effect);

    switch (parsed.type) {
      case 'reputation': {
        if (context.effectHandlers?.reputation) {
          await context.effectHandlers.reputation({
            sessionId: context.sessionId,
            actorId: context.actorId,
            factionId: parsed.factionId,
            delta: parsed.delta,
          });
          return;
        }

        await Promise.resolve(
          FactionService.updateReputation(
            context.sessionId,
            context.actorId,
            parsed.factionId,
            parsed.delta
          )
        );
        return;
      }
      case 'quest': {
        if (!context.effectHandlers?.quest) {
          console.warn('[DialogueTreeResolver] Missing quest effect handler');
          return;
        }
        await context.effectHandlers.quest({
          sessionId: context.sessionId,
          actorId: context.actorId,
          questId: parsed.questId,
          action: parsed.action,
        });
        return;
      }
      case 'item': {
        if (!context.effectHandlers?.item) {
          console.warn('[DialogueTreeResolver] Missing item effect handler');
          return;
        }
        await context.effectHandlers.item({
          sessionId: context.sessionId,
          actorId: context.actorId,
          itemId: parsed.itemId,
          action: parsed.action,
          quantity: parsed.quantity,
        });
        return;
      }
      case 'flag': {
        if (!context.effectHandlers?.flag) {
          console.warn('[DialogueTreeResolver] Missing flag effect handler');
          return;
        }
        await context.effectHandlers.flag({
          sessionId: context.sessionId,
          actorId: context.actorId,
          flagId: parsed.flagId,
          value: parsed.value,
        });
        return;
      }
      case 'custom': {
        if (!context.effectHandlers?.custom) {
          console.warn('[DialogueTreeResolver] Missing custom effect handler');
          return;
        }
        await context.effectHandlers.custom({
          sessionId: context.sessionId,
          actorId: context.actorId,
          handler: parsed.handler,
        });
        return;
      }
      default:
        break;
    }
  }

  /**
   * Parse dialogue tree records with schema validation.
   */
  private static parseDialogueTrees(
    trees: DialogueTreeRecord[]
  ): { tree: DialogueTree; priority: number }[] {
    const parsed: { tree: DialogueTree; priority: number }[] = [];

    for (const tree of trees) {
      const trigger = DialogueTriggerSchema.parse({
        type: tree.triggerType,
        ...(tree.triggerData ?? {}),
      });

      const normalized = DialogueTreeSchema.parse({
        id: tree.id,
        npcId: tree.npcId,
        trigger,
        startNodeId: tree.startNodeId,
        nodes: tree.nodes,
      });

      parsed.push({
        tree: normalized,
        priority: tree.priority ?? 0,
      });
    }

    return parsed;
  }
}

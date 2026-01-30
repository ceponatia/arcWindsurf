import { Effect } from 'effect';
import { getCharacterProfile, getOrCreateDialogueState } from '@minimal-rpg/db';
import type { LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { DialogueConditionContext } from './dialogue-tree-types.js';
import { DialogueTreeResolver } from './dialogue-tree-resolver.js';

/**
 * Context for dialogue resolution.
 */
export interface DialogueContext {
  /** Session id for conversation scoping */
  sessionId: string;
  /** Current conversation topic or state */
  topic?: string;
  /** Previous dialogue history (last N exchanges) */
  history?: readonly string[];
  /** Player's relationship level with the NPC */
  relationshipLevel?: number;
  /** Current location ID */
  locationId?: string;
  /** Condition and effect context for dialogue trees */
  conditionContext?: Partial<DialogueConditionContext>;
}

/**
 * Response from dialogue resolution.
 */
export interface DialogueResponse {
  content: string;
  options: readonly string[];
  treeId?: string | undefined;
  nodeId?: string | undefined;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DIALOGUE_SYSTEM_PROMPT = `You are an NPC in a fantasy RPG. Respond in character based on:
- Your personality traits and speech patterns
- Your current activity and engagement level
- Your relationship with the player
- The conversation history

Keep responses concise (1-3 sentences for casual, up to a paragraph for important topics).
Stay in character. Do not break the fourth wall.
If you don't know something, say so in character.`;

/**
 * Build a dialogue prompt from NPC profile, context, and history.
 */
function buildDialoguePrompt(
  profile: CharacterProfile,
  context: DialogueContext,
  history: ConversationMessage[]
): string {
  const lines: string[] = [];

  // NPC identity
  lines.push(`You are ${profile.name}.`);

  if (profile.personalityMap?.traits?.length) {
    lines.push(`Traits: ${profile.personalityMap.traits.join(', ')}`);
  }

  if (profile.personalityMap?.speech) {
    const speech = profile.personalityMap.speech;
    if (speech.vocabulary) lines.push(`Vocabulary: ${speech.vocabulary}`);
    if (speech.directness) lines.push(`Directness: ${speech.directness}`);
  }

  if (profile.summary) {
    lines.push(`Background: ${profile.summary}`);
  }

  // Current context
  if (context.topic) {
    lines.push(`Current topic: ${context.topic}`);
  }

  if (context.relationshipLevel !== undefined) {
    const rel =
      context.relationshipLevel > 50
        ? 'friendly'
        : context.relationshipLevel < -50
          ? 'hostile'
          : 'neutral';
    lines.push(`Relationship with player: ${rel}`);
  }

  // Conversation history
  if (history.length > 0) {
    lines.push('\nRecent conversation:');
    history.slice(-5).forEach((msg) => {
      const speaker = msg.role === 'user' ? 'Player' : profile.name;
      lines.push(`${speaker}: ${msg.content}`);
    });
  }

  // Player's current message
  if (context.history?.length) {
    const lastPlayerMessage = context.history[context.history.length - 1];
    lines.push(`\nPlayer says: "${lastPlayerMessage}"`);
  }

  lines.push('\nRespond in character:');

  return lines.join('\n');
}

/**
 * Dialogue Service
 *
 * Manages conversation state and dialogue trees.
 */
export class DialogueService {
  private static conversationHistory = new Map<string, ConversationMessage[]>();

  /**
   * Resolve dialogue response based on character state and input.
   * @param actorId - The NPC actor ID
   * @param context - Dialogue context for resolution
   */
  static async resolveResponse(
    actorId: string,
    context: DialogueContext,
    llmProvider: LLMProvider
  ): Promise<DialogueResponse> {
    const lastInput = context.history?.[context.history.length - 1] ?? '';
    const tree = await DialogueTreeResolver.findTree(actorId, lastInput, context);

    if (tree) {
      const stateRecord = await getOrCreateDialogueState(
        context.sessionId,
        actorId,
        tree.id,
        tree.startNodeId
      );
      const conditionContext = this.buildConditionContext(actorId, context);
      const resolved = await DialogueTreeResolver.resolve(tree, stateRecord, conditionContext);
      const nodeId = stateRecord.currentNodeId ?? tree.startNodeId;

      return {
        content: resolved.npcLine,
        options: resolved.options.map((opt) => opt.text),
        treeId: tree.id,
        nodeId,
      };
    }

    return this.resolveLLMResponse(actorId, context, llmProvider);
  }

  /**
   * Add a message to a session-scoped history cache.
   */
  private static addToHistory(
    key: string,
    role: ConversationMessage['role'],
    content: string
  ): void {
    const history = this.conversationHistory.get(key) ?? [];
    history.push({ role, content, timestamp: new Date() });

    if (history.length > 20) {
      history.shift();
    }

    this.conversationHistory.set(key, history);
  }

  /**
   * Build a condition context for dialogue tree evaluation.
   */
  private static buildConditionContext(
    actorId: string,
    context: DialogueContext
  ): DialogueConditionContext {
    const overrides = context.conditionContext ?? {};

    return {
      sessionId: context.sessionId,
      actorId: overrides.actorId ?? actorId,
      npcId: actorId,
      relationshipLevel: overrides.relationshipLevel ?? context.relationshipLevel,
      relationshipByFactionId: overrides.relationshipByFactionId,
      questStatus: overrides.questStatus,
      itemCounts: overrides.itemCounts,
      flags: overrides.flags,
      time: overrides.time,
      customConditionEvaluators: overrides.customConditionEvaluators,
      effectHandlers: overrides.effectHandlers,
    };
  }

  /**
   * Resolve dialogue using the LLM fallback.
   */
  private static async resolveLLMResponse(
    actorId: string,
    context: DialogueContext,
    llmProvider: LLMProvider
  ): Promise<DialogueResponse> {
    const profile = await getCharacterProfile(actorId);
    if (!profile) {
      return { content: '...', options: [] };
    }

    const historyKey = `${context.sessionId}-${actorId}`;
    const history = this.conversationHistory.get(historyKey) ?? [];

    const prompt = buildDialoguePrompt(profile, context, history);

    const lastPlayerMessage = context.history?.[context.history.length - 1];
    if (lastPlayerMessage) {
      this.addToHistory(historyKey, 'user', lastPlayerMessage);
    }

    try {
      const response = await Effect.runPromise(
        llmProvider.chat([
          { role: 'system', content: DIALOGUE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ])
      );

      const content = response.content ?? '...';
      this.addToHistory(historyKey, 'assistant', content);

      return {
        content,
        options: [],
      };
    } catch (error) {
      console.warn('[DialogueService] LLM dialogue failed', error);
      return { content: '...', options: [] };
    }
  }
}

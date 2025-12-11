import type { ParsedSegment } from '@minimal-rpg/schemas';
import type { CharacterWithInstance, NpcEvaluation, SceneAction } from './types.js';

/**
 * Context for NPC evaluation.
 */
export interface NpcEvaluationContext {
  /** Parsed player input segments */
  playerSegments: ParsedSegment[];

  /** Recent scene actions */
  recentActions: SceneAction[];

  /** Raw player input text */
  rawPlayerInput: string;
}

/**
 * NPC Evaluator - determines if an NPC would respond to player input.
 *
 * Uses quick heuristic checks (no LLM) to evaluate NPC response likelihood:
 * - Direct address detection (name mentioned)
 * - Observable action relevance
 * - Context-based triggers
 *
 * This replaces the heavy LLM-based ResponseComposer with lightweight evaluation.
 */
export class NpcEvaluator {
  /**
   * Evaluate whether an NPC would respond to the current turn.
   */
  evaluate(npc: CharacterWithInstance, context: NpcEvaluationContext): NpcEvaluation {
    const npcId = npc.instanceId ?? 'unknown';
    const npcName = typeof npc.name === 'string' ? npc.name : 'unknown';

    // Quick heuristic checks (no LLM needed)

    // 1. Check if NPC is directly addressed by name
    const addressed = this.isDirectlyAddressed(npcName, context);
    if (addressed) {
      return {
        npcId,
        wouldRespond: true,
        priority: 0.9,
        responseType: 'speech',
        reason: 'directly addressed by name',
      };
    }

    // 2. Check if player is speaking (observable speech segments)
    const hasSpeech = context.playerSegments.some((s) => {
      return (
        s &&
        typeof s === 'object' &&
        'type' in s &&
        s.type === 'speech' &&
        'observable' in s &&
        s.observable === true
      );
    });
    if (hasSpeech) {
      return {
        npcId,
        wouldRespond: true,
        priority: 0.7,
        responseType: 'speech',
        reason: 'player spoke (general conversation)',
      };
    }

    // 3. Check if NPC would react to observable actions
    const observableActions = context.playerSegments.filter((s) => {
      return (
        s &&
        typeof s === 'object' &&
        'type' in s &&
        s.type === 'action' &&
        'observable' in s &&
        s.observable === true
      );
    });
    if (observableActions.length > 0) {
      const shouldReact = this.wouldReactToActions(npc, observableActions);
      if (shouldReact) {
        return {
          npcId,
          wouldRespond: true,
          priority: 0.5,
          responseType: 'observation',
          reason: 'reacting to player action',
        };
      }
    }

    // 4. No relevant trigger found
    return {
      npcId,
      wouldRespond: false,
      priority: 0,
      responseType: 'silent',
      reason: 'no relevant trigger',
    };
  }

  /**
   * Check if NPC is directly addressed by name in the input.
   */
  private isDirectlyAddressed(npcName: string, context: NpcEvaluationContext): boolean {
    const lowerInput = context.rawPlayerInput.toLowerCase();
    const lowerName = npcName.toLowerCase();

    // Simple check: name appears in the input
    // This could be enhanced with more sophisticated NLP
    return lowerInput.includes(lowerName);
  }

  /**
   * Determine if NPC would react to the given observable actions.
   *
   * This is a simple heuristic check. Future enhancement could use:
   * - NPC personality traits (reactive vs passive)
   * - Relationship with player
   * - Current emotional state
   * - Action severity/impact
   */
  private wouldReactToActions(_npc: CharacterWithInstance, actions: ParsedSegment[]): boolean {
    // For now, assume NPCs react to most observable actions
    // This maintains conversational flow without being too passive

    // Check for action keywords that typically warrant reaction
    const reactionKeywords = [
      'grab',
      'take',
      'touch',
      'push',
      'pull',
      'throw',
      'break',
      'hit',
      'attack',
      'move',
      'walk',
      'run',
      'leave',
      'enter',
    ];

    return actions.some((action) => {
      if (!action || typeof action !== 'object' || !('content' in action)) {
        return false;
      }
      const content = action.content;
      if (typeof content !== 'string') {
        return false;
      }
      const lowerContent = content.toLowerCase();
      return reactionKeywords.some((keyword) => lowerContent.includes(keyword));
    });
  }

  /**
   * Evaluate multiple NPCs and return all evaluations.
   */
  evaluateMultiple(npcs: CharacterWithInstance[], context: NpcEvaluationContext): NpcEvaluation[] {
    const evaluations: NpcEvaluation[] = [];

    for (const npc of npcs) {
      const evaluation = this.evaluate(npc, context);
      evaluations.push(evaluation);
    }

    return evaluations;
  }
}

/**
 * Create a default NPC evaluator instance.
 */
export function createNpcEvaluator(): NpcEvaluator {
  return new NpcEvaluator();
}

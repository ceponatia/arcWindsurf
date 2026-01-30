/**
 * Session tool handlers - execute session-focused tool calls.
 *
 * These handlers query session state from the database and return
 * structured results for LLM consumption.
 */
import type { ToolCall, ToolResult } from './types.js';
import type {
  GetSessionTagsArgs,
  GetNpcTranscriptArgs,
  GetSessionTagsResult,
  GetSessionPersonaResult,
  QueryNpcListResult,
  GetNpcTranscriptResult,
  ExamineObjectArgs,
  NavigatePlayerArgs,
  UseItemArgs,
} from './types.js';
import {
  handleExamineObject,
  handleNavigatePlayer,
  handleUseItem,
} from './gameplay-handlers.js';
import {
  getSessionTagsWithDefinitions,
  drizzle,
  actorStates,
  events,
  eq,
  and,
  desc,
} from '@minimal-rpg/db/node';
import { toSessionId } from '../../utils/uuid.js';

interface ActorStateRow {
  actorId: string;
  actorType: string;
  state: unknown;
  entityProfileId?: string | null;
  createdAt?: Date;
}

interface ActorStatePayload {
  profile?: Record<string, unknown>;
  name?: string;
  status?: 'active' | 'inactive';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function toActorStatePayload(value: unknown): ActorStatePayload {
  if (!isRecord(value)) {
    return {};
  }

  const nameValue = value['name'];
  const statusValue = value['status'];
  const profileValue = value['profile'];

  const name = typeof nameValue === 'string' ? nameValue : undefined;
  const status = statusValue === 'active' || statusValue === 'inactive' ? statusValue : undefined;
  const profile = isRecord(profileValue) ? profileValue : undefined;

  return {
    ...(profile ? { profile } : {}),
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
  };
}

// =============================================================================
// Handler Configuration
// =============================================================================

export interface SessionToolHandlerConfig {
  /** Owner key for tenancy scoping */
  ownerEmail: string;
  /** Current session ID */
  sessionId: string;
}

// =============================================================================
// Session Tool Handler
// =============================================================================

/**
 * Executes session-focused tool calls.
 * These tools query session state from the database.
 */
export class SessionToolHandler {
  private readonly ownerEmail: string;
  private readonly sessionId: string;

  constructor(config: SessionToolHandlerConfig) {
    this.ownerEmail = config.ownerEmail;
    this.sessionId = config.sessionId;
  }

  /**
   * Execute a session tool call and return structured result.
   * Returns null if the tool is not a session tool.
   */
  async execute(toolCall: ToolCall): Promise<ToolResult | null> {
    let args: unknown;

    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch {
      return {
        success: false,
        error: `Failed to parse tool arguments: ${toolCall.function.arguments}`,
      };
    }

    switch (toolCall.function.name) {
      case 'get_session_tags':
        return this.executeGetSessionTags(args as GetSessionTagsArgs);
      case 'get_session_persona':
        return this.executeGetSessionPersona();
      case 'query_npc_list':
        return this.executeQueryNpcList();
      case 'get_npc_transcript':
        return this.executeGetNpcTranscript(args as GetNpcTranscriptArgs);
      case 'examine_object':
        return handleExamineObject(args as ExamineObjectArgs, this.buildGameplayContext());
      case 'navigate_player':
        return handleNavigatePlayer(args as NavigatePlayerArgs, this.buildGameplayContext());
      case 'use_item':
        return handleUseItem(args as UseItemArgs, this.buildGameplayContext());
      default:
        // Not a session tool - return null so caller can try other handlers
        return null;
    }
  }

  /**
   * Check if a tool name is handled by this handler.
   */
  static isSessionTool(toolName: string): boolean {
    return [
      'get_session_tags',
      'get_session_persona',
      'query_npc_list',
      'get_npc_transcript',
      'examine_object',
      'navigate_player',
      'use_item',
    ].includes(toolName);
  }

  /**
   * Build shared context for gameplay handlers.
   */
  private buildGameplayContext(): { ownerEmail: string; sessionId: string } {
    return {
      ownerEmail: this.ownerEmail,
      sessionId: this.sessionId,
    };
  }

  // ===========================================================================
  // Tool Implementations
  // ===========================================================================

  /**
   * Get active session tags.
   */
  private async executeGetSessionTags(
    args: GetSessionTagsArgs
  ): Promise<GetSessionTagsResult | ToolResult> {
    try {
      const bindings = await getSessionTagsWithDefinitions(this.ownerEmail, this.sessionId, {
        enabledOnly: true,
      });

      let tags = bindings.map((b) => ({
        id: b.tagId,
        name: b.tag.name,
        promptText: b.tag.promptText ?? '',
        category: b.tag.category ?? undefined,
      }));

      // Filter by category if specified
      if (args.category) {
        tags = tags.filter((t) => t.category?.toLowerCase() === args.category?.toLowerCase());
      }

      return {
        success: true,
        tags,
        count: tags.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get session tags: ${message}`,
      };
    }
  }

  /**
   * Get session persona.
   */
  private async executeGetSessionPersona(): Promise<GetSessionPersonaResult | ToolResult> {
    try {
      // In the new schema, persona is stored as an actor_state with actorType 'player'
      const playerRows = await drizzle
        .select()
        .from(actorStates)
        .where(
          and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'player'))
        )
        .limit(1);

      const playerState = playerRows[0];

      if (!playerState) {
        return {
          success: true,
          persona: null,
          has_persona: false,
        };
      }

      const state = toActorStatePayload(playerState.state);
      const profileSource = state.profile ?? state;
      const profileRecord = isRecord(profileSource) ? profileSource : {};
      const nameValue = profileRecord['name'];
      const name = typeof nameValue === 'string' ? nameValue : playerState.actorId;
      const description =
        typeof profileRecord['description'] === 'string' ? profileRecord['description'] : undefined;
      const attributes = isRecord(profileSource) ? profileSource : {};

      return {
        success: true,
        persona: {
          id: playerState.actorId,
          name,
          description,
          attributes,
        },
        has_persona: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get session persona: ${message}`,
      };
    }
  }

  /**
   * Query NPCs in session.
   */
  private async executeQueryNpcList(): Promise<QueryNpcListResult | ToolResult> {
    try {
      // Query actorStates for this session
      const instances = (await drizzle
        .select()
        .from(actorStates)
        .where(
          and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'npc'))
        )
        .orderBy(desc(actorStates.createdAt))) as ActorStateRow[];

      const npcs = instances.map((instance) => {
        const state = toActorStatePayload(instance.state);
        const name = state.name ?? instance.actorId;

        return {
          id: instance.actorId,
          name,
          template_id: instance.entityProfileId ?? instance.actorId,
          is_active: state.status === 'active',
        };
      });

      return {
        success: true,
        npcs,
        count: npcs.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to query NPC list: ${message}`,
      };
    }
  }

  /**
   * Get NPC conversation transcript.
   */
  private async executeGetNpcTranscript(
    args: GetNpcTranscriptArgs
  ): Promise<GetNpcTranscriptResult | ToolResult> {
    try {
      const limit = args.limit ?? 20;

      // Query SPOKE events for this session related to the NPC
      // Note: We might want events where actorId is NPC OR where targetActorId is NPC
      const rows = await drizzle
        .select()
        .from(events)
        .where(and(eq(events.sessionId, toSessionId(this.sessionId)), eq(events.type, 'SPOKE')))
        .orderBy(desc(events.sequence))
        .limit(limit);

      // Map speaker field to role (player -> user, npc/narrator -> assistant)
      const messages = rows.reverse().map((row) => {
        const payload = isRecord(row.payload) ? row.payload : {};
        const content = typeof payload['content'] === 'string' ? payload['content'] : '';
        return {
          role: row.actorId === 'player' ? 'user' : 'assistant',
          content,
          timestamp: row.timestamp.toISOString(),
        };
      });

      // Try to get NPC name from actor states
      let npcName: string | undefined;
      const actorRows = await drizzle
        .select()
        .from(actorStates)
        .where(
          and(
            eq(actorStates.sessionId, toSessionId(this.sessionId)),
            eq(actorStates.actorId, args.npc_id)
          )
        )
        .limit(1);

      const actorState = actorRows[0];

      if (actorState) {
        const state = toActorStatePayload(actorState.state);
        npcName = state.name;
      }

      return {
        success: true,
        npc_id: args.npc_id,
        npc_name: npcName,
        messages,
        count: messages.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get NPC transcript: ${message}`,
      };
    }
  }
}

/**
 * Factory function to create a SessionToolHandler.
 */
export function createSessionToolHandler(config: SessionToolHandlerConfig): SessionToolHandler {
  return new SessionToolHandler(config);
}

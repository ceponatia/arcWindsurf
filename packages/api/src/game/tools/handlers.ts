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
} from './types.js';
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

interface ActorStatePayload {
  profile?: Record<string, unknown>;
  name?: string;
  status?: 'active' | 'inactive';
}

interface SessionTagBinding {
  tag_id: string;
  tag: {
    name: string;
    prompt_text: string | null;
    category: string | null;
  };
}

function toActorStatePayload(value: unknown): ActorStatePayload {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name : undefined;
  const status =
    candidate.status === 'active' || candidate.status === 'inactive'
      ? candidate.status
      : undefined;
  const profile =
    candidate.profile && typeof candidate.profile === 'object'
      ? (candidate.profile as Record<string, unknown>)
      : undefined;

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
    ].includes(toolName);
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
      const bindings =
        (await getSessionTagsWithDefinitions(this.ownerEmail, this.sessionId, {
          enabledOnly: true,
        })) as SessionTagBinding[];

      let tags = bindings.map((b) => ({
        id: b.tag_id,
        name: b.tag.name,
        promptText: b.tag.prompt_text ?? '',
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
      const [playerState] = await drizzle
        .select()
        .from(actorStates)
        .where(
          and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'player'))
        )
        .limit(1);

      if (!playerState) {
        return {
          success: true,
          persona: null,
          has_persona: false,
        };
      }

      const state = toActorStatePayload(playerState.state);
      const profile = state.profile ?? state;
      const name = typeof profile.name === 'string' ? profile.name : playerState.actorId;
      const description =
        typeof (profile as Record<string, unknown>).description === 'string'
          ? (profile as Record<string, unknown>).description
          : undefined;

      return {
        success: true,
        persona: {
          id: playerState.actorId,
          name,
          description,
          attributes: profile,
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
      const instances = await drizzle
        .select()
        .from(actorStates)
        .where(
          and(eq(actorStates.sessionId, toSessionId(this.sessionId)), eq(actorStates.actorType, 'npc'))
        )
        .orderBy(desc(actorStates.createdAt));

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
        const payload = (row.payload ?? {}) as { content?: string };
        const content = typeof payload.content === 'string' ? payload.content : '';
        return {
          role: row.actorId === 'player' ? 'user' : 'assistant',
          content,
          timestamp: row.timestamp.toISOString(),
        };
      });

      // Try to get NPC name from actor states
      let npcName: string | undefined;
      const [actorState] = await drizzle
        .select()
        .from(actorStates)
        .where(
          and(
            eq(actorStates.sessionId, toSessionId(this.sessionId)),
            eq(actorStates.actorId, args.npc_id)
          )
        )
        .limit(1);

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

/**
 * Session tool handlers - execute session-focused tool calls.
 *
 * These handlers query session state from the database and return
 * structured results for LLM consumption.
 */
import type { ToolCall, ToolResult } from './types.js';
import type {
  GetSessionTagsArgs,
  QueryNpcListArgs,
  GetNpcTranscriptArgs,
  GetSessionTagsResult,
  GetSessionPersonaResult,
  QueryNpcListResult,
  GetNpcTranscriptResult,
} from './types.js';
import { getNpcMessages, getSessionTagsWithDefinitions } from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import { safeParseJson } from '../../util/json.js';

// =============================================================================
// Handler Configuration
// =============================================================================

export interface SessionToolHandlerConfig {
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
  private readonly sessionId: string;

  constructor(config: SessionToolHandlerConfig) {
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
        return this.executeQueryNpcList(args as QueryNpcListArgs);
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
      const bindings = await getSessionTagsWithDefinitions(this.sessionId, {
        enabledOnly: true,
      });

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
      const sessionPersona = await db.sessionPersona.findUnique({
        where: { sessionId: this.sessionId },
      });

      if (!sessionPersona) {
        return {
          success: true,
          persona: null,
          has_persona: false,
        };
      }

      // Get the persona details
      const persona = await db.persona.findUnique({
        where: { id: sessionPersona.personaId },
      });

      if (!persona) {
        return {
          success: true,
          persona: null,
          has_persona: false,
        };
      }

      // Parse profileJson for name and attributes
      const profile = safeParseJson<Record<string, unknown>>(persona.profileJson, {});
      const name = typeof profile['name'] === 'string' ? profile['name'] : persona.id;
      const description =
        typeof profile['description'] === 'string' ? profile['description'] : undefined;

      return {
        success: true,
        persona: {
          id: persona.id,
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
  private async executeQueryNpcList(
    args: QueryNpcListArgs
  ): Promise<QueryNpcListResult | ToolResult> {
    try {
      // Use characterInstance table (NPCs are stored there with role='npc')
      const instances = await db.characterInstance.findMany({
        where: { sessionId: this.sessionId },
        orderBy: { createdAt: 'asc' },
      });

      // Filter to only NPC roles if active_only is set
      // (In this context, "active" means role != 'primary')
      let filtered = instances;
      if (args.active_only) {
        filtered = instances.filter((i) => i.role === 'npc');
      }

      const npcs = filtered.map((instance) => {
        // Try to get name from profileJson
        const profile = safeParseJson<{ name?: string }>(instance.profileJson, {});
        const name = profile.name ?? instance.templateId;

        return {
          id: instance.id,
          name,
          template_id: instance.templateId,
          is_active: instance.role === 'npc',
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

      const rows = await getNpcMessages(this.sessionId, args.npc_id, { limit });

      // Map speaker field to role (player -> user, npc/narrator -> assistant)
      const messages = rows.map((row) => ({
        role: row.speaker === 'player' ? 'user' : 'assistant',
        content: row.content,
        timestamp: row.createdAt,
      }));

      // Try to get NPC name from character instance
      let npcName: string | undefined;
      const instances = await db.characterInstance.findMany({
        where: { sessionId: this.sessionId },
      });

      // Find matching instance by id or templateId
      const matchingInstance = instances.find(
        (i) => i.id === args.npc_id || i.templateId === args.npc_id
      );

      if (matchingInstance) {
        const profile = safeParseJson<{ name?: string }>(matchingInstance.profileJson, {});
        npcName = profile.name;
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

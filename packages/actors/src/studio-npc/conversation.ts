import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import { Effect } from 'effect';
import type { ConversationMessage } from './types.js';

const MAX_CONTEXT_MESSAGES = 20;
const SUMMARIZATION_THRESHOLD = 20;
export const KEEP_RECENT_COUNT = 5;

const SUMMARIZATION_SYSTEM_PROMPT = `You summarize character creation conversations concisely.
Focus on:
- Key personality traits revealed by the character
- Important backstory details mentioned
- Emotional moments or relationship dynamics shown
- Values, fears, or beliefs expressed
- Speech patterns and communication style observed

Output JSON only:
{
  "summary": "<2-3 sentence narrative summary>",
  "keyPoints": ["<point 1>", "<point 2>", ...]
}

Keep summaries under 200 words. Preserve character voice and key quotes.`;

export interface ConversationManagerConfig {
  llmProvider: LLMProvider;
  characterName?: string | undefined;
}

/**
 * Manages message history, context windowing, and automatic summarization for studio sessions.
 */
export class ConversationManager {
  private messages: ConversationMessage[] = [];
  private summary: string | null = null;
  private readonly llmProvider: LLMProvider;
  private readonly characterName: string;

  constructor(config: ConversationManagerConfig) {
    this.llmProvider = config.llmProvider;
    this.characterName = config.characterName ?? 'Character';
  }

  /**
   * Get all messages (for UI display).
   */
  getAllMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get the current summary.
   */
  getSummary(): string | null {
    return this.summary;
  }

  /**
   * Add a message to the conversation.
   */
  addMessage(message: ConversationMessage): void {
    this.messages.push(message);
  }

  /**
   * Get messages for LLM context (limited to MAX_CONTEXT_MESSAGES).
   */
  getContextWindow(): ConversationMessage[] {
    const conversational = this.messages.filter(m => m.role !== 'system');
    return conversational.slice(-MAX_CONTEXT_MESSAGES);
  }

  /**
   * Get the full context string for LLM (summary + recent messages).
   */
  getFullContext(): string {
    const parts: string[] = [];

    if (this.summary) {
      parts.push(`[Previous conversation summary]\n${this.summary}`);
    }

    const recent = this.getContextWindow();
    if (recent.length > 0) {
      parts.push('[Recent conversation]');
      for (const msg of recent) {
        const speaker = msg.role === 'user' ? 'User' : this.characterName;
        parts.push(`${speaker}: ${msg.content}`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Check if summarization is needed.
   */
  needsSummarization(): boolean {
    const conversational = this.messages.filter(m => m.role !== 'system');
    return conversational.length >= SUMMARIZATION_THRESHOLD && this.summary === null;
  }

  /**
   * Summarize older messages and keep only recent ones in full detail.
   */
  async summarize(): Promise<void> {
    const conversational = this.messages.filter(m => m.role !== 'system');

    if (conversational.length < SUMMARIZATION_THRESHOLD) {
      return;
    }

    const toSummarize = conversational.slice(0, -KEEP_RECENT_COUNT);

    if (toSummarize.length === 0) {
      return;
    }

    const prompt = this.buildSummarizationPrompt(toSummarize);

    const messages: LLMMessage[] = [
      { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      const parsed = this.parseSummaryResponse(result.content);

      if (parsed) {
        // Combine with existing summary if present
        if (this.summary) {
          this.summary = `${this.summary}\n\n${parsed.summary}`;
        } else {
          this.summary = parsed.summary;
        }
      }
    } catch (error) {
      console.error('[ConversationManager] Summarization failed:', error);
      // Continue without summary on failure
    }
  }

  /**
   * Clear all conversation state.
   */
  clear(): void {
    this.messages = [];
    this.summary = null;
  }

  /**
   * Restore state from persisted data.
   */
  restore(data: {
    messages: ConversationMessage[];
    summary: string | null;
  }): void {
    this.messages = data.messages;
    this.summary = data.summary;
  }

  /**
   * Export state for persistence.
   */
  export(): { messages: ConversationMessage[]; summary: string | null } {
    return {
      messages: this.messages,
      summary: this.summary,
    };
  }

  private buildSummarizationPrompt(messages: ConversationMessage[]): string {
    const lines: string[] = [];
    lines.push(`Summarize this conversation with ${this.characterName}:`);
    lines.push('');

    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'User' : this.characterName;
      lines.push(`${speaker}: ${msg.content}`);
    }

    return lines.join('\n');
  }

  private parseSummaryResponse(content: string | null): { summary: string; keyPoints: string[] } | null {
    if (!content) return null;

    try {
      const parsed = JSON.parse(content) as { summary?: string; keyPoints?: string[] };
      if (!parsed.summary) return null;
      return {
        summary: parsed.summary,
        keyPoints: parsed.keyPoints ?? [],
      };
    } catch {
      // Fallback: treat entire response as summary
      const trimmed = content.trim();
      if (trimmed.length > 0 && trimmed.length < 1000) {
        return {
          summary: trimmed,
          keyPoints: [],
        };
      }
      return null;
    }
  }
}

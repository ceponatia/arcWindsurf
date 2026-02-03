import { z } from 'zod';

/**
 * Supported message roles across storage, UI, and LLM tooling.
 */
export const MESSAGE_ROLES = ['system', 'user', 'assistant', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];
export const MessageRoleSchema = z.enum(MESSAGE_ROLES);

export type ConversationMessageRole = Exclude<MessageRole, 'tool'>;
export type UserAssistantMessageRole = Extract<MessageRole, 'user' | 'assistant'>;

import type { SessionTagInstance } from '@minimal-rpg/schemas';

export type { SessionTagInstance };

// Errors & API status
export interface ApiError {
  ok: false;
  error: string | Record<string, unknown>;
}

// Runtime config (public subset)
export interface RuntimeConfigPublic {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterModel: string;
  governorDevMode: boolean;
}

// Full internal runtime configuration (includes secrets / private values)
export interface RuntimeConfig {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterApiKey: string;
  openrouterModel: string;
  governorDevMode: boolean;
}

// LLM chat roles
export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * Speaker metadata for chat UI display.
 * Included in turn responses so UI can show character name/avatar.
 */
export interface Speaker {
  /** Character template ID */
  id: string;
  /** Display name */
  name: string;
  /** Profile picture URL (user-uploadable) */
  profilePic?: string | undefined;
  /** Emote picture URL (future: generated per-response) */
  emotePic?: string | undefined;
}

// Config / health / hello DTOs
export interface HelloResponse {
  ok: true;
  message: string;
}
export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  db: { ok: boolean };
  llm: { provider: string; model: string; configured: boolean };
}
export type RuntimeConfigResponse = RuntimeConfigPublic;

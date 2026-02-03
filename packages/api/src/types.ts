import type {
  SessionTagInstance,
  Speaker,
  ApiError,
} from '@minimal-rpg/schemas';

export type { SessionTagInstance, Speaker, ApiError };

// Runtime config (public subset)
export interface RuntimeConfigPublic {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterModel: string;
}

// Full internal runtime configuration (includes secrets / private values)
export interface RuntimeConfig {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterApiKey: string;
  openrouterModel: string;
  debugLlm: boolean;
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

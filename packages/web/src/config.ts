interface ViteEnv {
  VITE_API_BASE_URL?: string;
  VITE_API_MESSAGE_TIMEOUT_MS?: string;
  VITE_STRICT_MODE?: string;
  VITE_GOVERNOR_DEV_MODE?: string;
}

const env = import.meta.env as ViteEnv;

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? 'http://localhost:3002';
export const MESSAGE_TIMEOUT_MS = Number(env.VITE_API_MESSAGE_TIMEOUT_MS ?? '180000');
export const STRICT_MODE: boolean = String(env.VITE_STRICT_MODE ?? '').toLowerCase() === 'true';
export const GOVERNOR_DEV_MODE: boolean =
  String(env.VITE_GOVERNOR_DEV_MODE ?? '').toLowerCase() === 'true';

// The governor/turns pipeline is the default for message handling.
export const USE_TURNS_API = true;

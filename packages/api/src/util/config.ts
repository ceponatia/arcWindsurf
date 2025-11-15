export interface RuntimeConfig {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterApiKey: string;
  openrouterModel: string;
}

// Narrowed view of process.env for this app
interface AppEnv extends NodeJS.ProcessEnv {
  PORT?: string;
  CONTEXT_WINDOW?: string;
  TEMPERATURE?: string;
  TOP_P?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
}

const env = process.env as AppEnv;

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getConfig(): RuntimeConfig {
  const port = num(env.PORT, 3001);
  const contextWindow = num(env.CONTEXT_WINDOW, 12);

  const temperature = Number.isFinite(Number(env.TEMPERATURE)) ? Number(env.TEMPERATURE) : 0.7;

  const topP = Number.isFinite(Number(env.TOP_P)) ? Number(env.TOP_P) : 0.9;

  const openrouterApiKey = env.OPENROUTER_API_KEY ?? '';
  const openrouterModel = env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';

  return {
    port,
    contextWindow,
    temperature,
    topP,
    openrouterApiKey,
    openrouterModel,
  };
}

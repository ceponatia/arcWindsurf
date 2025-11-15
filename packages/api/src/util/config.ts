export interface RuntimeConfig {
  port: number;
  contextWindow: number;
  temperature: number;
  topP: number;
  openrouterApiKey: string;
  openrouterModel: string;
}

function num(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getConfig(): RuntimeConfig {
  const port = num(process.env.PORT, 3001);
  const contextWindow = num(process.env.CONTEXT_WINDOW, 12);
  const temperature = Number.isFinite(Number(process.env.TEMPERATURE))
    ? Number(process.env.TEMPERATURE)
    : 0.7;
  const topP = Number.isFinite(Number(process.env.TOP_P)) ? Number(process.env.TOP_P) : 0.9;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY ?? '';
  const openrouterModel = process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
  return { port, contextWindow, temperature, topP, openrouterApiKey, openrouterModel };
}

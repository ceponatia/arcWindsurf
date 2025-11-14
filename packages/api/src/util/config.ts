export interface RuntimeConfig {
  port: number
  contextWindow: number
  temperature: number
  topP: number
  ollamaBaseUrl: string
  ollamaModel: string
}

function num(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getConfig(): RuntimeConfig {
  const port = num(process.env.PORT, 3001)
  const contextWindow = num(process.env.CONTEXT_WINDOW, 12)
  const temperature = Number.isFinite(Number(process.env.TEMPERATURE)) ? Number(process.env.TEMPERATURE) : 0.7
  const topP = Number.isFinite(Number(process.env.TOP_P)) ? Number(process.env.TOP_P) : 0.9
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'mistral:instruct'
  if (!ollamaBaseUrl || !ollamaModel) {
    // Keep minimal validation; endpoints will handle missing config
  }
  return { port, contextWindow, temperature, topP, ollamaBaseUrl, ollamaModel }
}

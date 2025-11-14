interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaChatResponse {
  message?: { role: 'assistant'; content: string }
  error?: string
}

interface ChatWithOllamaOptions {
  baseUrl: string
  model: string
  messages: ChatMessage[]
  timeoutMs?: number
  options?: { temperature?: number; top_p?: number; max_tokens?: number }
}

interface OllamaMessagePayload {
  message?: { role?: string; content?: unknown }
  response?: unknown
}

export async function chatWithOllama(opts: ChatWithOllamaOptions): Promise<OllamaChatResponse> {
  const { baseUrl, model, messages, timeoutMs = 60_000, options = {} } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const endpoint = `${trimTrailingSlash(baseUrl)}/api/chat`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await safeText(res)
      return { error: `Ollama error ${res.status}: ${text}` }
    }
    const payload = await safeJson(res)
    const assistantReply = extractAssistantContent(payload)
    if (assistantReply) {
      return { message: { role: 'assistant', content: assistantReply } }
    }
    return { error: 'Invalid Ollama response' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { error: `Ollama request failed: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '')
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return '<no body>'
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extractAssistantContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const data = payload as OllamaMessagePayload
  const messageContent = data.message?.content
  if (typeof messageContent === 'string') {
    return messageContent
  }
  if (typeof data.response === 'string') {
    return data.response
  }
  return null
}

interface ViteEnv {
	VITE_API_BASE_URL?: string
	VITE_API_MESSAGE_TIMEOUT_MS?: string
}

const env = import.meta.env as ViteEnv

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? 'http://localhost:3001'
export const MESSAGE_TIMEOUT_MS = Number(env.VITE_API_MESSAGE_TIMEOUT_MS ?? '60000')

import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { randomUUID } from 'node:crypto'
import { loadData, type LoadedData } from './data/loader.js'
import { createSession, getSession, appendMessage, listSessions } from './sessions/store.js'
import { getEffectiveProfiles, upsertCharacterOverrides, upsertSettingOverrides, getEffectiveCharacter, getEffectiveSetting } from './sessions/instances.js'
import { buildPrompt, assertPromptConfigValid } from './llm/prompt.js'
import { chatWithOpenRouter } from './llm/openrouter.js'
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas'
import { getConfig } from './util/config.js'
import { getVersion } from './util/version.js'
import { prisma, resolvedDbUrl, resolvedDbPath } from './db/prisma.js'
import { access } from 'node:fs/promises'
import { Prisma as PrismaNs } from '@prisma/client'

const app = new Hono()

app.onError((err, c) => {
	console.error('[server] Unhandled error:', err)
	const message = (err && typeof err === 'object' && 'message' in err) ? (err as { message?: string }).message ?? 'Server error' : 'Server error'
	return c.json({ ok: false, error: message }, 500)
})

app.get('/hello', (c) => c.json({ ok: true, message: 'hello' }))
app.get('/config', (c) => {
	const cfg = getConfig()
	return c.json({
		port: cfg.port,
		contextWindow: cfg.contextWindow,
		temperature: cfg.temperature,
		topP: cfg.topP,
		openrouterModel: cfg.openrouterModel,
	}, 200)
})
app.get('/health', async (c) => {
	const uptime = process.uptime()
	const version = await getVersion()
	// DB check
	let dbOk = false
	try {
		const { prisma } = await import('./db/prisma.js')
		await prisma.$queryRaw`SELECT 1`
		dbOk = true
	} catch (error) {
		console.warn('Database health check failed', error)
	}
	const cfg = getConfig()
	// For now just return config presence as LLM health indicator
	const llmOk = Boolean(cfg.openrouterApiKey && cfg.openrouterModel)
	return c.json({ status: dbOk && llmOk ? 'ok' : 'degraded', uptime, version, db: { ok: dbOk }, llm: { provider: 'openrouter', model: cfg.openrouterModel, configured: llmOk } }, 200)
})

let loaded: LoadedData | undefined = undefined

async function start() {
	try {
		assertPromptConfigValid()
		loaded = await loadData()
		console.log(`Startup: loaded ${loaded.characters.length} characters and ${loaded.settings.length} settings`) 
	} catch (err) {
		console.error('Failed to load data', (err as Error).message)
		process.exit(1)
	}
	const cfg = getConfig()
	console.log('Runtime config', {
		port: cfg.port,
		contextWindow: cfg.contextWindow,
		temperature: cfg.temperature,
		topP: cfg.topP,
		openrouterModel: cfg.openrouterModel,
		openrouterApiKeySet: Boolean(cfg.openrouterApiKey),
	})

	// Enable CORS for browser-based clients (Vite dev on 5173, etc.)
	app.use('*', cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
	}))

	// GET /characters - return summarized character profiles
	app.get('/characters', (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const mapped = loaded.characters.map((ch: CharacterProfile) => {
			const base: { id: string; name: string; summary: string; tags?: string[] } = {
				id: ch.id,
				name: ch.name,
				summary: ch.summary,
			}
			if (ch.tags && ch.tags.length > 0) base.tags = ch.tags
			return base
		})
		return c.json(mapped, 200)
	})

	// GET /settings - return summarized setting profiles
	app.get('/settings', (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const mapped = loaded.settings.map((s: SettingProfile) => ({ id: s.id, name: s.name, tone: s.tone }))
		return c.json(mapped, 200)
	})

	// GET /sessions - list existing sessions with display-friendly names
	app.get('/sessions', async (c) => {
		const sessions = await listSessions()
		if (!loaded) return c.json(sessions, 200)
		const decorated = sessions.map((sess) => {
			const character = loaded?.characters.find((ch) => ch.id === sess.characterId)
			const setting = loaded?.settings.find((s) => s.id === sess.settingId)
			return {
				...sess,
				characterName: character?.name,
				settingName: setting?.name,
			}
		})

		return c.json(decorated, 200)
	})

	// Admin DB endpoints (dev tooling)
	app.get('/admin/db/overview', async (c) => {
		if (process.env.ADMIN_DB_TOOLS !== 'true') {
			return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403)
		}
		try {
			const models = PrismaNs.dmmf.datamodel.models
			interface Column { name: string; type: string; isId: boolean; isRequired: boolean; isList: boolean }
			type Row = Record<string, unknown>
			const results: { name: string; columns: Column[]; rowCount: number; sample: Row[] }[] = []
			for (const m of models) {
				const name = m.name
				const columns = m.fields.map((f) => ({ name: f.name, type: typeof f.type === 'string' ? String(f.type) : 'object', isId: !!f.isId, isRequired: !!f.isRequired, isList: !!f.isList }))
				const delegateName = name.charAt(0).toLowerCase() + name.slice(1)
				// narrow dynamic delegate access to a safe shape
				const delegateMap = prisma as unknown as Record<string, { count?: () => Promise<number>; findMany?: (args: { take?: number; orderBy?: unknown }) => Promise<Row[]> }>
				const delegate = delegateMap[delegateName]
				let rowCount = 0
				let sample: Row[] = []
				if (delegate) {
					try {
						rowCount = typeof delegate.count === 'function' ? await delegate.count() : 0
					} catch {
						/* noop */
					}
					try {
						const orderBy = m.fields.some((f) => f.name === 'createdAt') ? { createdAt: 'desc' as const } : undefined
						sample = typeof delegate.findMany === 'function' ? await delegate.findMany({ take: 50, orderBy }) : []
					} catch {
						/* noop */
					}
				}
				results.push({ name, columns, rowCount, sample })
			}
			return c.json({ tables: results }, 200)
		} catch (err) {
			console.error('DB overview error', (err as Error).message)
			return c.json({ ok: false, error: 'Failed to load DB overview' }, 500)
		}
	})

	app.get('/admin/db/path', async (c) => {
		if (process.env.ADMIN_DB_TOOLS !== 'true') return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403)
		let exists = false
		try { await access(resolvedDbPath); exists = true } catch { /* noop */ }
		return c.json({ url: resolvedDbUrl, path: resolvedDbPath, exists }, 200)
	})

	app.delete('/admin/db/:model/:id', async (c) => {
		if (process.env.ADMIN_DB_TOOLS !== 'true') {
			return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403)
		}
		const modelParam = c.req.param('model')
		const idParam = c.req.param('id')
		if (!modelParam || !idParam) return c.json({ ok: false, error: 'model and id are required' }, 400)
		try {
			const models = PrismaNs.dmmf.datamodel.models
			const model = models.find((m) => m.name.toLowerCase() === modelParam.toLowerCase())
			if (!model) return c.json({ ok: false, error: 'Unknown model' }, 400)
			const idFields = model.fields.filter((f) => f.isId)
			if (idFields.length !== 1 || idFields[0]?.name !== 'id') {
				return c.json({ ok: false, error: 'Delete only supported for single id primary key named "id"' }, 400)
			}
			const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1)
			const delegateMap = prisma as unknown as Record<string, { delete?: (args: { where: { id: string } }) => Promise<unknown> }>
			const delegate = delegateMap[delegateName]
			if (!(delegate && typeof delegate.delete === 'function')) return c.json({ ok: false, error: 'Delete not supported for model' }, 400)
			try {
				await delegate.delete({ where: { id: idParam } })
			} catch (err: unknown) {
				const msg = (err && typeof err === 'object' && 'message' in err) ? String((err as { message?: unknown }).message) : String(err)
				if (/Record to delete does not exist/i.test(msg)) return c.json({ ok: false, error: 'Not found' }, 404)
				throw err
			}
			console.warn(`[admin-db] delete ${model.name} id=${idParam}`)
			return c.body(null, 204)
		} catch (err) {
			console.error('DB delete error', (err as Error).message)
			return c.json({ ok: false, error: 'Failed to delete row' }, 500)
		}
	})

	// GET /sessions/:id - return full conversation
	app.get('/sessions/:id', async (c) => {
		const id = c.req.param('id')
		const session = await getSession(id)
		if (!session) return c.json({ ok: false, error: 'session not found' }, 404)
		// ensure chronological order by createdAt (ISO strings compare lexicographically)
		const sorted = {
			...session,
			messages: [...session.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
		}
		return c.json(sorted, 200)
	})

	// GET /sessions/:id/effective - return effective merged character + setting for the session
	app.get('/sessions/:id/effective', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const id = c.req.param('id')
		const session = await getSession(id)
		if (!session) return c.json({ ok: false, error: 'session not found' }, 404)
		const character = loaded.characters.find((ch) => ch.id === session.characterId)
		const setting = loaded.settings.find((s) => s.id === session.settingId)
		if (!character || !setting) return c.json({ ok: false, error: 'character or setting not found for session' }, 500)
		const effective = await getEffectiveProfiles(session.id, character, setting)
		return c.json(effective, 200)
	})

	// PUT /sessions/:id/overrides/character - upsert character overrides for the session
	app.put('/sessions/:id/overrides/character', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const id = c.req.param('id')
		const session = await getSession(id)
		if (!session) return c.json({ ok: false, error: 'session not found' }, 404)
		const character = loaded.characters.find((ch) => ch.id === session.characterId)
		if (!character) return c.json({ ok: false, error: 'character not found for session' }, 500)
		const body: unknown = await c.req.json().catch(() => null)
		const overrides = (body && typeof body === 'object') ? (body as Record<string, unknown>) : undefined
		if (!overrides || Array.isArray(overrides)) return c.json({ ok: false, error: 'overrides must be an object' }, 400)
		const audit = await upsertCharacterOverrides({ sessionId: session.id, characterId: character.id, baseline: character, overrides })
		const effective = await getEffectiveCharacter(session.id, character)
		return c.json({ effective, audit }, 200)
	})

	// PUT /sessions/:id/overrides/setting - upsert setting overrides for the session
	app.put('/sessions/:id/overrides/setting', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const id = c.req.param('id')
		const session = await getSession(id)
		if (!session) return c.json({ ok: false, error: 'session not found' }, 404)
		const setting = loaded.settings.find((s) => s.id === session.settingId)
		if (!setting) return c.json({ ok: false, error: 'setting not found for session' }, 500)
		const body: unknown = await c.req.json().catch(() => null)
		const overrides = (body && typeof body === 'object') ? (body as Record<string, unknown>) : undefined
		if (!overrides || Array.isArray(overrides)) return c.json({ ok: false, error: 'overrides must be an object' }, 400)
		const audit = await upsertSettingOverrides({ sessionId: session.id, settingId: setting.id, baseline: setting, overrides })
		const effective = await getEffectiveSetting(session.id, setting)
		return c.json({ effective, audit }, 200)
	})

	// POST /sessions/:id/messages - append a user message
	app.post('/sessions/:id/messages', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const id = c.req.param('id')
		const session = await getSession(id)
		if (!session) {
			return c.json({ ok: false, error: 'session not found' }, 404)
		}
		const rawBody: unknown = await c.req.json().catch(() => null)
		if (!isMessageRequest(rawBody)) {
			return c.json({ ok: false, error: 'content must be 1..4000 characters' }, 400)
		}
		const { content } = rawBody
		if (content.length < 1 || content.length > 4000) {
			return c.json({ ok: false, error: 'content must be 1..4000 characters' }, 400)
		}
		await appendMessage(session.id, 'user', content)
		console.info(`Session ${session.id}: user message (${content.length} chars) queued`)

		const character = loaded.characters.find((ch) => ch.id === session.characterId)
		const setting = loaded.settings.find((s) => s.id === session.settingId)
		if (!character || !setting) {
			return c.json({ ok: false, error: 'character or setting not found for session' }, 500)
		}

		const cfg = getConfig()
		if (!cfg.openrouterApiKey || !cfg.openrouterModel) {
			return c.json({ ok: false, error: 'Missing OPENROUTER_API_KEY or OPENROUTER_MODEL env vars' }, 500)
		}

		const sessAfterUser = await getSession(session.id)
		const history = sessAfterUser?.messages ?? session.messages
		const effective = await getEffectiveProfiles(session.id, character, setting)
		const messages = buildPrompt({ character: effective.character, setting: effective.setting, history, historyWindow: cfg.contextWindow })
		console.info(`Session ${session.id}: calling OpenRouter model ${cfg.openrouterModel} with ${messages.length} messages`)
		const result = await chatWithOpenRouter({ apiKey: cfg.openrouterApiKey, model: cfg.openrouterModel, messages, options: { temperature: cfg.temperature, top_p: cfg.topP } })
		if (result.error) {
			console.error(`Session ${session.id}: OpenRouter error -> ${result.error}`)
			return c.json({ ok: false, error: result.error }, 502)
		}
		const contentReply = result.message?.content ?? ''
		if (!contentReply.trim()) {
			return c.json({ ok: false, error: 'Empty assistant response from OpenRouter' }, 502)
		}
		await appendMessage(session.id, 'assistant', contentReply)
		const sessAfterAssistant = await getSession(session.id)
		const last = sessAfterAssistant?.messages.at(-1)
		console.info(`Session ${session.id}: assistant reply (${contentReply.length} chars) stored`)
		return c.json({ message: last ?? { role: 'assistant', content: contentReply, createdAt: new Date().toISOString() } }, 200)
	})

	// POST /sessions - create a new session for characterId + settingId
	app.post('/sessions', async (c) => {
		if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500)
		const rawBody: unknown = await c.req.json().catch(() => null)
		if (!isCreateSessionRequest(rawBody)) {
			return c.json({ ok: false, error: 'characterId and settingId are required' }, 400)
		}
		const { characterId, settingId } = rawBody
		const charExists = loaded.characters.some((ch) => ch.id === characterId)
		const setExists = loaded.settings.some((s) => s.id === settingId)
		if (!charExists || !setExists) {
			return c.json({ ok: false, error: 'characterId or settingId not found' }, 400)
		}
		const id = safeRandomId()
		const session = await createSession(id, characterId, settingId)
		const response = { id: session.id, characterId: session.characterId, settingId: session.settingId, createdAt: session.createdAt }
		return c.json(response, 201)
	})

	const port = Number(process.env.PORT ?? 3001)
	serve({ fetch: app.fetch, port })
	console.log(`API server listening on http://localhost:${port}`)
}

interface MessageRequestBody {
	content: string
}

interface CreateSessionRequestBody {
	characterId: string
	settingId: string
}

function isMessageRequest(body: unknown): body is MessageRequestBody {
	return Boolean(body && typeof body === 'object' && typeof (body as { content?: unknown }).content === 'string')
}

function isCreateSessionRequest(body: unknown): body is CreateSessionRequestBody {
	if (!body || typeof body !== 'object') return false
	const { characterId, settingId } = body as { characterId?: unknown; settingId?: unknown }
	return typeof characterId === 'string' && typeof settingId === 'string'
}

function safeRandomId(): string {
	try {
		return randomUUID()
	} catch {
		return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
	}
}

void start()

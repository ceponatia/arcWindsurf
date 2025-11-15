# Core Requirements (scope guardrails)

## Non-negotiables

- Use TypeScript end-to-end.
- Use Ollama locally with Mistral Instruct 7B.
- Characters & settings defined via JSON files:
  - Loaded on startup
  - Selectable in UI (dropdown / list)
- Chat loop:
  - User picks character → sends messages
  - System injects:
    - Character persona
    - World/setting context
    - Style rules (rich RP narration, not bland Q&A)
  - Messages stored per session (simple DB or file)
- Output:
  - Rich prose: narration, inner thoughts, scene description, dialogue
  - Strong “stay in character” bias via prompt design
- No extras:
  - No auth (initially)
  - No character editor
  - No fancy multi-model routing
  - No marketplace nonsense

## High-Level Architecture

### Backend (TypeScript, Node)

- Framework: Hono, Elysia, or Express (pick 1; don’t bikeshed).
- Responsibilities:
  - Load & validate character/setting JSON
  - Expose endpoints:
    - GET /characters
    - POST /sessions (init chat with selected character)
    - GET /sessions/:id
    - POST /sessions/:id/messages → calls Ollama → returns reply
  - Call Ollama HTTP API for Mistral:
    - Construct prompts using:
      - System message (RP engine + style)
      - Character sheet
      - Setting
      - Conversation history
  - Store sessions:
    - Start with SQLite via Prisma, or a JSON file store for speed.

### Frontend (TypeScript)

- Stack: React or SvelteKit; single-page layout.
- Features:
  - Character picker (cards/list)
- Chat window:
  - Messages grouped by speaker
  - Support multi-paragraph narration
  - Show active character + brief summary.
- Optional: “Regenerate last reply” button.

### Character & Setting Data

- Example shape:

```json
type CharacterProfile = {
  id: string;
  name: string;
  summary: string;
  backstory: string;
  personality: string;
  goals: string[];
  speakingStyle: string;
  tags?: string[];
};
type SettingProfile = {
  id: string;
  name: string;
  lore: string;
  tone: string;
  constraints?: string[];
};
```

## Prompt & Message Design (this is where RP quality lives)

### Backend should normalize messages into

- system: RP engine + rules
- assistant: model outputs
- user: human inputs
- tool/metadata: if needed later

### Base system prompt (sketch, you’ll refine)

- You are an in-character narrative AI for a roleplaying experience.
- Stay strictly in character as the selected persona.
- Use vivid third-person narration mixed with dialogue.
- Advance the scene, react to user input, and maintain tone, lore, and continuity.
- Never break character to talk about being an AI or model.
- Avoid generic filler; be specific, sensory, and grounded in the provided setting and character profile.

### On each request, server builds something like

- System: RP rules (above)
- System: Serialized character sheet (compact)
- System: Serialized setting
- Recent conversation turns (last N, e.g. 10–20)
  New user message

This is the spine; don’t pollute it with UI fluff.

## Roadmap

### Phase 0 – Project Skeleton

- Initialize repo:
  - pnpm, turbo + TS configs
  - packages/api, packages/web, packages/shared (mini-monorepo)
- Add linting & formatting:
  - ESLint + Prettier
- Create .env pattern for Ollama endpoint/config.

Deliverable: Builds, lints, runs a hello-world endpoint.

### Phase 1 – Data Model & Validation

- Define CharacterProfile & SettingProfile types.
- Implement Zod schemas.
- Load JSON from data/characters/_.json, data/settings/_.json.
- On startup:
  - Validate all JSON
  - Fail fast with clear errors
- Endpoint: GET /characters, GET /settings.

Deliverable: Typed, validated characters & settings; no rendering yet.

### Phase 2 – Chat Engine / Ollama Integration

- Implement POST /sessions:
  - Body: { characterId, settingId }
  - Create session record.
- Implement POST /sessions/:id/messages:
  - Append user message
  - Build prompt:
    - System RP rules + char + setting + recent history
  - Call Ollama:
    - POST /api/chat (Mistral 7B Instruct)
  - Save assistant reply.
- Implement GET /sessions/:id:
  - Return conversation history.

Design for stateless clients; logic lives server-side.
Deliverable: cURL-able API that returns solid in-character RP text.

### Phase 3 – Minimal Frontend

- Simple UI:
  - Left: Character list (name, short blurb)
  - Left, Lower: Sessions list (previously created & saved chat sessions)
  - Right: Chat panel
- Flow:
  - Choose character → creates session
  - Type message → sends to /sessions/:id/messages
  - Stream or poll → display reply
- Show:
  - Character name + setting in header
  - Messages styled distinctly (user vs character)

Deliverable: Fully usable local RP chat, no fluff.

### Phase 4 – Quality & RP Depth

- Tune prompts for:
  - Rich narration
  - Consistent POV & tone
  - World continuity
- Add:
  - “Style” fields in character JSON (sentence length, humor, darkness, etc.)
  - Instruction for handling boundaries (e.g., fade-to-black if needed).
- Add basic safeguards:
  - Max tokens / truncation of history
  - Simple content filter if desired.

Deliverable: Conversations feel like story sessions, not tech demos.

### Phase 5 – Persistence & Packaging

- Make session storage durable:
  - SQLite + Prisma schema: UserSession, Message.
- Add:
  - /health endpoint
  - Config for:
    - Model name
    - Context size
    - Temperature/top_p
  - Provide:
    - docker-compose.yml for:
    - API
    - Web
  - (Optionally) Ollama (or document manual setup)

Deliverable: Re-runnable, portable app.

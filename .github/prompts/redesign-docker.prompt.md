# Minimal-RPG Docker + pnpm Refactor — Copilot Task Prompt

You are a coding agent working inside the **minimal-rpg** monorepo. Your goal is to:

- Move `pnpm install` to **Docker image build time** (not container startup).
- Make `docker compose up` (via new scripts) **automatically reinstall deps when lockfile changes**.
- Keep `pnpm core` working for local dev, with an optional safety net to auto-install.

Follow the steps below in order. For each step:

- Locate the referenced file(s).
- If the file exists, **edit in place** and preserve unrelated content.
- If the file does not exist, **create it** with the content shown.

---

## Step 1 — Create a shared dev Dockerfile at repo root

**Goal:** Build a base image that installs deps once at build time with `CI=true pnpm install`, then reuses it for `api` and `web` services.

**Target file:** `Dockerfile.dev` at the **repo root** (same level as root `package.json`).

If `Dockerfile.dev` already exists, merge this behavior into it; otherwise, create it with the following baseline content:

```dockerfile
# Dockerfile.dev
FROM node:20

WORKDIR /app

# 1. Copy workspace metadata first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Optionally, copy just the package manifests we care about
COPY packages/api/package.json ./packages/api/package.json
COPY packages/web/package.json ./packages/web/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json

# 2. Install dependencies at build time, non-interactive
RUN corepack enable \
  && CI=true pnpm install --frozen-lockfile

# 3. Copy the rest of the repo
COPY . .

# 4. Build shared pieces you always want up to date
RUN pnpm -F @minimal-rpg/schemas build

# You can also build api/web here if you prefer prod-style images:
# RUN pnpm -F @minimal-rpg/api build && pnpm -F @minimal-rpg/web build

# 5. Default command is a no-op; docker-compose services will override it
CMD ["node", "-e", "console.log('Base image ready')"]
```

Constraints:

- Keep `CI=true` on `pnpm install` so it doesn’t try to interact with a TTY.
- Keep `--frozen-lockfile` (or equivalent) to enforce lockfile determinism.

---

## Step 2 — Update `docker-compose.yml` to use the new image and remove runtime installs

**Goal:**

- Use `build: { context: ., dockerfile: Dockerfile.dev }` for `api` and `web`.
- Remove `corepack enable && pnpm -w install` from service commands.
- Only run migrations + dev servers at container startup.

**Target file:** `docker-compose.yml` at repo root.

In the `services.api` section, update it to follow this general pattern (adapt to existing env vars/ports as needed):

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=minirpg
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'postgres']
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    working_dir: /app
    # If you enable volumes for hot reload, see Step 3 notes below.
    # volumes:
    #   - .:/app
    environment:
      - PORT=3001
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/minirpg
      - NODE_ENV=development
    ports:
      - '3001:3001'
    command: >-
      sh -c "pnpm -F @minimal-rpg/db db:migrate && pnpm -F @minimal-rpg/api dev"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 5s
      timeout: 3s
      retries: 10

  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    working_dir: /app
    # volumes:
    #   - .:/app
    environment:
      - VITE_API_BASE_URL=http://localhost:3001
    ports:
      - '5173:5173'
    command: >-
      sh -c "pnpm -F @minimal-rpg/web dev -- --host 0.0.0.0"
    depends_on:
      api:
        condition: service_healthy
```

Requirements:

- Remove any `corepack enable && pnpm -w install` style logic from `api` and `web` commands.
- Keep existing environment variables and port mappings, merging them into this pattern.
- Preserve any additional services that already exist.

---

## Step 3 — (Optional) Set up Docker volumes for hot reload without breaking node_modules

If the repo currently uses `volumes: - .:/app` for `api` and/or `web`, this overrides the entire `/app` tree (including `node_modules`) and can force you to reinstall deps at runtime.

**Goal:** If hot reload is desired in containers, mount the project but keep `node_modules` as a container volume so it persists.

**Target file:** `docker-compose.yml` (`services.api` and `services.web`).

Suggested pattern:

```yaml
api:
  build:
    context: .
    dockerfile: Dockerfile.dev
  working_dir: /app
  volumes:
    - .:/app
    - /app/node_modules
  # ... rest of api config

web:
  build:
    context: .
    dockerfile: Dockerfile.dev
  working_dir: /app
  volumes:
    - .:/app
    - /app/node_modules
  # ... rest of web config
```

Notes for the agent:

- If hot reload is not needed in Docker (e.g., Docker is just for smoke tests), you can omit these volumes entirely.
- If you add the node_modules volume, the first install to populate it can happen during `docker build` (preferred) or via a one-off `docker compose run api pnpm install`.

---

## Step 4 — Add root package.json scripts for Docker orchestration

**Goal:** Provide simple root-level scripts that:

- Run `docker compose up --build` so images are rebuilt when `pnpm-lock.yaml` or manifests change.
- Make it easy for the user to run Docker without remembering the `--build` flag.

**Target file:** root `package.json`.

In the existing `scripts` section (which already contains `core`, `dev`, `build`, etc.), add or update the following entries:

```jsonc
{
  "scripts": {
    // existing scripts...
    "core": "node scripts/core.mjs",
    "core:quit": "node scripts/core-quit.mjs",
    "dev": "turbo dev",

    "docker:up": "docker compose up --build",
    "docker:up:detached": "docker compose up --build -d",
    "docker:down": "docker compose down",
  },
}
```

Constraints:

- Merge these into the existing `scripts` object; do **not** overwrite other scripts.
- If `core` or `core:quit` are already defined, keep their existing command values and only add `docker:*` entries.

Resulting usage:

- `pnpm docker:up` → builds images (running `CI=true pnpm install` in Dockerfile if lockfile changed) and starts services.
- `pnpm docker:up:detached` → same but detached.
- `pnpm docker:down` → stops everything.

---

## Step 5 — (Optional) Add a `precore` script to auto-install deps for local dev

**Goal:** When running `pnpm core` directly on the host, automatically run `pnpm install` first so the user doesn’t forget after dependency changes.

**Target file:** root `package.json`.

If desired, extend the `scripts` with:

```jsonc
{
  "scripts": {
    "precore": "pnpm install --frozen-lockfile",
    "core": "node scripts/core.mjs",
  },
}
```

Notes for the agent:

- If a `precore` script already exists, merge/adjust rather than overwrite blindly.
- This runs on the host, not in Docker, so there is no TTY issue with pnpm here.

---

## Step 6 — Sanity checks & clean-up

After making all changes:

1. Validate that `Dockerfile.dev` and `docker-compose.yml` are syntactically valid (no obvious YAML or JSON errors).
2. Ensure root `package.json` is valid JSON (no trailing commas) and that all added scripts are under the existing `scripts` key.
3. Confirm that **no** service command in `docker-compose.yml` still runs `pnpm install` or `corepack enable` at container startup.
4. Ensure the `api` service still runs DB migrations before starting the dev server:
   - `pnpm -F @minimal-rpg/db db:migrate && pnpm -F @minimal-rpg/api dev`

Do not modify unrelated parts of the repository. Preserve existing behavior for `pnpm core` and any other scripts unless explicitly changed above.

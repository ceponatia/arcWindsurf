# Workspace Root Cleanup Recommendations

## Current State

The root directory currently contains **40+ items**, making navigation difficult. This document outlines actionable recommendations to reduce clutter.

---

## 🚨 Immediate Actions (Quick Wins)

### 1. Delete Accidental File

```bash
rm "sword psql -h localhost -p 5433 -U postgres -d minirpg -t -c select tablename from pg_catalog.pg_tables where schemaname = 'public';"
```

This appears to be an accidentally created file from a mistyped terminal command.

### 2. Add to `.gitignore` (if not already)

These generated files shouldn't clutter the repo:

```gitignore
.eslintcache
coverage/
migration_output.txt
```

### 3. Move Stray Documentation

| File | Recommended Location |
|------|---------------------|
| `WORLD_BUS_STATUS.md` | `dev-docs/status/` or `packages/bus/` |
| `gov-plan.md` | `dev-docs/plan/` |
| `migration_output.txt` | Delete or add to `.gitignore` |

---

## 📁 Configuration Consolidation

### Option A: Create a `config/` folder structure

Move tool-specific configs into the existing `config/` directory:

```text
config/
├── tsup.base.ts          # (already here)
├── linting/
│   ├── eslint.config.mjs
│   ├── .prettierrc
│   ├── .prettierignore
│   ├── .markdownlint.json
│   └── .secretlintrc.cjs
├── git/
│   └── commitlint.config.cjs
└── docker/
    ├── Dockerfile.api
    ├── Dockerfile.dev
    └── docker-compose.yml
```

**Pros:** Much cleaner root, logical grouping
**Cons:** Some tools expect configs at root; requires updating tool paths

### Option B: Keep configs at root (status quo with cleanup)

Many modern JS tools expect configs at the project root. If moving isn't feasible, at least:

- Consolidate TypeScript configs into one where possible
- Ensure all gitignore-able files are ignored

---

## 📊 Root File Inventory

### Must Stay at Root (tool requirements)

| File | Reason |
|------|--------|
| `package.json` | npm/pnpm requirement |
| `pnpm-lock.yaml` | pnpm requirement |
| `pnpm-workspace.yaml` | pnpm workspaces |
| `tsconfig.base.json` | TypeScript project references |
| `tsconfig.build.json` | TypeScript build config |
| `turbo.json` | Turborepo requirement |
| `vitest.workspace.ts` | Vitest workspace config |
| `eslint.config.mjs` | ESLint flat config |
| `README.md` | Project documentation |
| `.gitignore` | Git requirement |
| `.env.example` | Environment template |

### Can Be Moved

| File | Current | Suggested |
|------|---------|-----------|
| `Dockerfile.api` | root | `docker/` or `config/docker/` |
| `Dockerfile.dev` | root | `docker/` or `config/docker/` |
| `docker-compose.yml` | root | `docker/` (with `-f` flag) |
| `commitlint.config.cjs` | root | `config/` (with path in husky) |
| `.markdownlint.json` | root | `config/linting/` |
| `.secretlintrc.cjs` | root | `config/linting/` |
| `.prettierrc` | root | `config/` (needs prettier `--config`) |
| `.prettierignore` | root | `config/` |

### Should Be Deleted/Ignored

| File | Action |
|------|--------|
| `sword psql...` | **Delete immediately** |
| `migration_output.txt` | Delete or gitignore |
| `.eslintcache` | Add to gitignore |

---

## 📂 Recommended Directory Structure

```text
arcWindsurf/
├── .github/              # GitHub workflows & config
├── .husky/               # Git hooks
├── .windsurf/            # Windsurf IDE config
├── config/               # All configuration files
│   ├── docker/
│   ├── linting/
│   └── tsup.base.ts
├── dev-docs/             # Developer documentation
├── packages/             # Monorepo packages
├── scripts/              # Build & utility scripts
├── waves/                # Wave planning docs
├── .env.example
├── .gitignore
├── eslint.config.mjs     # (stays - ESLint expects it here)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── tsconfig.base.json
├── tsconfig.build.json
├── turbo.json
└── vitest.workspace.ts
```

**Result:** Root reduced from ~25 visible files to ~12

---

## 🔧 Implementation Steps

1. **Immediate:** Delete the accidental `sword psql...` file
2. **Immediate:** Add `.eslintcache`, `coverage/`, `migration_output.txt` to `.gitignore`
3. **Short-term:** Move `WORLD_BUS_STATUS.md` and `gov-plan.md` to `dev-docs/`
4. **Medium-term:** Create `config/docker/` and move Dockerfiles
5. **Optional:** Consolidate linting configs (requires testing tool paths)

---

## Notes

- Moving configs requires updating any scripts/CI that reference them
- Some IDEs auto-detect configs at root; moving may affect DX
- Consider team preference before major restructuring

---

## 📋 Configuration Consolidation Feasibility Analysis

### Summary

| Config | Movable? | Effort | Recommendation |
|--------|----------|--------|----------------|
| `eslint.config.mjs` | ❌ No | N/A | **Keep at root** |
| `.prettierrc` | ⚠️ Possible | Medium | Keep at root |
| `commitlint.config.cjs` | ✅ Yes | Low | Can move |
| `.markdownlint.json` | ✅ Yes | Low | Can move |
| `.secretlintrc.cjs` | ✅ Yes | Low | Can move |
| `Dockerfile.*` | ✅ Yes | Low | Can move |
| `docker-compose.yml` | ✅ Yes | Low | Can move |
| `tsconfig.*.json` | ❌ No | N/A | **Must stay at root** |
| `turbo.json` | ❌ No | N/A | **Must stay at root** |
| `vitest.workspace.ts` | ❌ No | N/A | **Must stay at root** |

### Detailed Analysis

#### ❌ Cannot Move: ESLint (`eslint.config.mjs`)

**Reason:** ESLint flat config uses `import.meta.dirname` for TypeScript project resolution:

```javascript
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname,  // Must resolve to project root
  },
},
```

Moving this file would break type-aware linting across all packages. The `ESLINT_USE_FLAT_CONFIG` discovery also expects the config at the project root.

#### ❌ Cannot Move: TypeScript Configs

**Reason:** `tsconfig.base.json` is extended by all package-level tsconfigs using relative paths like `"extends": "../../tsconfig.base.json"`. Moving it would require updating every package's tsconfig.

#### ❌ Cannot Move: Turbo & Vitest

**Reason:** Both tools require their configs at the monorepo root by design. Turborepo specifically looks for `turbo.json` at the workspace root.

#### ⚠️ Possible but Not Recommended: Prettier (`.prettierrc`)

**Why it's possible:** Prettier supports `--config` flag.

**Why not recommended:**
- `lint-staged` in `package.json` calls `prettier --write` without a config path
- IDE integrations auto-detect `.prettierrc` at root
- Would need to update `lint-staged` config and ensure all devs configure their IDEs

#### ✅ Can Move: Commitlint (`commitlint.config.cjs`)

**Current usage:**

```bash
pnpm -w exec commitlint --edit "$1"
```

**To move:** Update `.husky/commit-msg` to:

```bash
pnpm -w exec commitlint --config config/commitlint.config.cjs --edit "$1"
```

#### ✅ Can Move: Markdownlint (`.markdownlint.json`)

**Not currently used in CI or hooks.** Can move to `config/` and update any future lint commands with `--config config/.markdownlint.json`.

#### ✅ Can Move: Secretlint (`.secretlintrc.cjs`)

**Current usage:** Called via `scripts/git-hooks/scan-secrets-staged.mjs`

**To move:** Update the script to use `--secretlintrcfile`:

```javascript
execFileSync('pnpm', ['-w', 'exec', 'secretlint', '--secretlintrcfile', 'config/.secretlintrc.cjs', ...files], {
```

#### ✅ Can Move: Docker Files

**Current usage:** CI workflow references `file: Dockerfile.api`

**To move:** Create `docker/` folder and update:
- `.github/workflows/api-ghcr-staging.yml`: Change `file: Dockerfile.api` → `file: docker/Dockerfile.api`
- Update any local docker commands

### Final Recommendation

**Don't consolidate linting configs.** The effort vs. benefit ratio is poor:

- ESLint (the most complex) **cannot** move
- Prettier is best left at root for IDE compatibility
- Moving 3 small files (commitlint, markdownlint, secretlint) saves minimal clutter

**Do consolidate Docker files** if you want a quick win:

```text
docker/
├── Dockerfile.api
├── Dockerfile.dev
└── docker-compose.yml
```

This removes 3 files from root with minimal CI changes.

### Root File Count After Realistic Cleanup

| Action | Files Removed |
|--------|---------------|
| Delete `sword psql...` | 1 |
| Move Docker files to `docker/` | 3 |
| Move `WORLD_BUS_STATUS.md` to `dev-docs/` | 1 |
| Move `gov-plan.md` to `dev-docs/plan/` | 1 |
| Delete `migration_output.txt` | 1 |
| **Total** | **7 files** |

**Result:** Root reduced from ~25 to ~18 visible files — a meaningful improvement without breaking tooling.

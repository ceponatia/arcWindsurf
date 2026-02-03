# Iterative Playbook: Consolidate Duplicate Types + Export Narrow Subtypes

> **Created**: February 3, 2026
> **Scope**: Turning “canonical type + derived variants via `Pick`/`Omit`” into a repeatable, rerunnable workflow.
> **Audience**: Agentic LLM (medium reasoning), with up to ~100k tokens of repo context.

## Goal

Repeatedly:

1. Detect duplicate or near-duplicate TypeScript type definitions across packages.
2. Choose a canonical definition location (usually `@minimal-rpg/schemas`).
3. Export narrow package-specific variants derived from the canonical type via `Pick<>`/`Omit<>` (or unions), instead of redefining types.
4. Update all imports/usages to use canonical + derived variants.
5. Validate with `typecheck` (and tests if applicable).

This should be safe to run multiple times, gradually shrinking the “duplicate types” surface area.

## Non-goals

- No redesign of runtime behavior.
- No large-scale architecture rewrites.
- No new product features.
- Avoid refactors unrelated to type consistency.

## Preconditions / Constraints

- Canonical types live in `packages/schemas/src/...` whenever they are shared across domains.
- Prefer shared Zod schemas for runtime validation; avoid duplicate type definitions.
- Keep changes surgical: update only types and their imports/usages.
- Do not introduce `eslint-disable` comments.

## Inputs

- Entire repo (large context window is available).
- A seed list of known duplicates (optional): `MessageRole`, `PresenceRecord`, `PresenceScheduler`, `ValidationResult`, etc.

## Outputs

- Canonical type modules added under `packages/schemas/src/**`.
- Narrow subtype exports (still in schemas, or in a package boundary file if truly package-internal).
- Updated imports in all affected packages.
- A small “registry” section in this file (or a sibling file) listing what is consolidated and where.

## Core Loop (Run This Repeatedly)

### Step 0: Pick one target type name

Start with a single type name (e.g. `MessageRole`). Avoid batching multiple unrelated type names in one iteration.

Acceptance target for an iteration:

- Only one canonical definition remains.
- Other packages import it (and/or a derived variant) instead of redefining it.

### Step 1: Discover all definitions and all usages

**Search for definitions** (type aliases, interfaces, enums, Zod schemas that imply types):

- Look for: `export type <Name>`, `type <Name>`, `export interface <Name>`, `interface <Name>`, `enum <Name>`.
- Also check for Zod schema exports that generate or imply the type: `export const <name>Schema = z...` plus `z.infer<typeof ...>`.

**Search for usages**:

- Imports: `import type { <Name> } from ...`
- Type references: `: <Name>`, `as <Name>`, generics like `<Name>`, `Record<<Name>, ...>`.

Record in a scratch pad:

- Definition locations (file paths + the exported shape).
- Usage locations (which packages consume it).

### Step 2: Normalize and compare shapes

Classify the type across packages:

- **Identical**: same union members / fields / optionality.
- **Superset/subset**: one has more union members or more fields.
- **Conflicting**: different meaning with same name (rename may be required).

If conflicting meaning is found, stop and resolve naming first (don’t force consolidation).

### Step 3: Choose a canonical shape

Heuristics:

- If one variant is clearly the “full” one used across system boundaries, make it canonical.
- If variants differ only by narrowing (subset), canonical should be the **broadest** safe representation.
- If some variant is intentionally restricted in a UI or a boundary, keep canonical broad and derive the restricted type.

### Step 4: Create canonical module in `@minimal-rpg/schemas`

Add a new module under `packages/schemas/src/shared/` (or a more specific domain folder).

Example path patterns:

- `packages/schemas/src/shared/message-types.ts`
- `packages/schemas/src/shared/presence-types.ts`
- `packages/schemas/src/shared/validation-types.ts`

Guidelines:

- Prefer `export type ...` for pure types.
- If runtime validation exists/should exist, define a Zod schema and export `z.infer` type.
- Keep schema files focused on structure (no functional logic).

### Step 5: Export narrow variants using `Pick`/`Omit` (or unions)

In the same canonical module (preferred) export derived variants.

Patterns:

1. **Subset union**:

```ts
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Narrow UI subset
export type ChatMessageRole = Exclude<MessageRole, 'tool' | 'system'>;
```

2. **Pick a structural subset**:

```ts
export interface PresenceRecord {
  sessionId: string;
  actorId: string;
  lastSeenAtMs: number;
  status: 'online' | 'offline';
}

// Worker only needs these fields
export type PresenceHeartbeat = Pick<PresenceRecord, 'actorId' | 'lastSeenAtMs'>;
```

3. **Omit internal-only fields**:

```ts
export interface ValidationResult {
  ok: boolean;
  issues?: Array<{ path: string; message: string }>;
  debug?: { ruleId: string };
}

// Web store should not rely on debug payload
export type PublicValidationResult = Omit<ValidationResult, 'debug'>;
```

Rules of thumb:

- Use `Pick`/`Omit` when a restricted type is “same thing, fewer fields”.
- Use union narrowing (`Exclude`, explicit unions) when restriction is about allowed values.
- If a package needs stricter guarantees (e.g., `issues` always present when `ok=false`), consider a canonical discriminated union instead of multiple ad hoc variants.

### Step 6: Update packages to import canonical + derived variants

For each prior definition:

- Delete the local duplicate type.
- Replace it with `import type { CanonicalType } from '@minimal-rpg/schemas/...';` or a barrel export.
- If the package used a narrower subset previously, switch it to the derived variant export (e.g. `PublicValidationResult`).

Important:

- Prefer type-only imports (`import type`) when possible.
- Avoid deep imports if the schemas package has an existing public barrel; if it doesn’t, consider adding a minimal `index.ts` export in the relevant schemas folder.

### Step 7: Repair call sites and boundary conversions

Common fixes you’ll need:

- If a package previously used a narrower union, you may need to map values:

```ts
function toChatRole(role: MessageRole): ChatMessageRole {
  if (role === 'tool' || role === 'system') return 'assistant';
  return role;
}
```

- If a package has more fields than allowed by a `Pick`-derived type, choose whether to:
  - Keep those fields locally in a separate “internal” type, or
  - Expand the canonical type if those fields are truly cross-domain.

### Step 8: Validate

At minimum:

- Run typecheck: `turbo run typecheck`

If there are tests in the touched packages, run the smallest relevant test set.

### Step 9: Record the consolidation

Update the registry section in this doc with:

- Canonical module path
- Canonical type name
- Derived variants exported
- Packages migrated

This makes future iterations faster and prevents reintroducing duplicates.

## Rerunnable Detection Heuristics

The loop above is “human-driven but systematic.” For an agentic LLM, make detection more repeatable with this checklist each run:

- For the current target type name:
  - [ ] Find all definitions across `packages/**/src/**`.
  - [ ] Confirm there is exactly 1 canonical definition under `packages/schemas/src/**`.
  - [ ] Confirm no other package defines the same exported symbol.
  - [ ] Confirm all imports now come from schemas (or derived variants).

Once that holds, pick the next type name and repeat.

## Optional Automation (If You Later Add a Script)

If you later implement an internal script (not required for this playbook), its job would be:

- Build a map of exported type names per package.
- Flag any name exported by 2+ packages.
- Print a report:

```text
Type: MessageRole
- packages/db/src/...
- packages/llm/src/...
- packages/web/src/...

Suggested action:
- Canonicalize in packages/schemas/src/shared/message-types.ts
- Derive ChatMessageRole = Exclude<MessageRole, 'tool' | 'system'>
```

Implementation approaches:

- Use `ts-morph` to parse exports across the monorepo.
- Or use the TypeScript compiler API to enumerate symbols.

Even with a script, keep the migration loop the same: one type name per iteration.

## Registry (Fill This In As You Go)

Add a new row each time you complete an iteration.

| Type | Canonical location | Derived variants | Packages migrated | Notes |
|------|---------------------|-----------------|------------------|-------|
| `MessageRole` | `packages/schemas/src/shared/message-types.ts` | `ConversationMessageRole`, `UserAssistantMessageRole` | db, web | Removed package-level aliases |
| `LoadedSensoryModifiers` | `packages/schemas/src/shared/sensory-modifiers-types.ts` | - | api, retrieval | Removed duplicate loader interfaces |
| `ChatRole` | `packages/schemas/src/shared/message-types.ts` | `ConversationMessageRole` | api | Removed API alias export |
| Tool types (`ToolParameterSchema`, `ToolDefinition`, `ToolCall`, `ToolResult`) | `packages/schemas/src/shared/tool-types.ts` | - | api, llm, utils | Removed duplicate tool interfaces |

## Acceptance Criteria (Per Iteration)

- [ ] Exactly one canonical definition exists (in schemas).
- [ ] All other packages import the canonical type or a derived variant.
- [ ] Narrow needs are represented via `Pick`/`Omit`/union derivations, not redefinitions.
- [ ] `turbo run typecheck` passes.
- [ ] Registry updated with canonical path + derived variants.

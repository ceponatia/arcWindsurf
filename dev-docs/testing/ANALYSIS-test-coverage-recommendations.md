# Test Coverage Analysis and Recommendations

## Executive Summary

The codebase has strong unit test foundations in backend packages but significant gaps in:

1. **Frontend component tests** - Most UI components untested
2. **Integration/E2E flows** - Critical user journeys lack coverage
3. **Correctness tests** - Many tests validate shape/types but not business logic

## Tooling Assessment

### Current Setup ✅

| Package | Vitest | Testing Library | Playwright | Status |
|---------|--------|-----------------|------------|--------|
| web | ✅ | ✅ | ✅ | Good tooling, needs more tests |
| ui | ✅ | ✅ | - | Good tooling, needs more tests |
| api | ✅ | - | - | Sufficient |
| actors | ✅ | - | - | Sufficient |
| schemas | ✅ | - | - | Sufficient |
| db | ✅ | - | - | Sufficient |
| utils | ✅ | - | - | Sufficient |
| workers | ✅ | - | - | Sufficient |
| bus | ✅ | - | - | Sufficient (some mock issues) |
| characters | ✅ | - | - | Sufficient |
| generator | ✅ | - | - | Sufficient |
| llm | ✅ | - | - | Sufficient (some mock issues) |
| projections | ✅ | - | - | Sufficient |
| retrieval | ✅ | - | - | Sufficient |
| services | ✅ | - | - | Sufficient |

### Missing from Workspace ✅ FIXED

These packages now have `vitest.config.ts` and are included in `vitest.workspace.ts`:

- `bus` ✅
- `characters` ✅
- `generator` ✅
- `llm` ✅
- `projections` ✅
- `retrieval` ✅
- `services` ✅

> **Note:** Some tests in `bus` and `llm` have pre-existing vi.mock hoisting issues that need to be fixed separately.

### Tooling Verdict

**Keep Vitest** - It's sufficient for all packages. No need to add Jest, Mocha, or other frameworks.

**Keep current Testing Library + Playwright setup** - Already configured for `web` and `ui`. Focus on writing more tests, not changing tools.

**Optional additions:**

- **MSW (Mock Service Worker)** - For mocking API calls in component tests without real backend
- **Storybook** - For visual regression testing of UI components (only if design changes are frequent)

## Critical Correctness Gaps

These are places where tests exist but don't verify the app works *correctly*:

### 1. Business Logic Not Verified

| Package | Gap | Impact |
|---------|-----|--------|
| services | Schedule resolution doesn't test actual NPC placement | NPCs could be at wrong locations |
| services | Dialogue tree conditions only test flags, not relationship/quest/time | Dialogue options could appear incorrectly |
| actors | Studio machine state transitions not tested | Character generation could fail silently |
| api | Turn orchestrator integration tests skipped | Game turns could break |

### 2. Integration Seams Untested

| Flow | Missing Coverage |
|------|------------------|
| web → api → services | Session creation, message sending, state updates |
| bus → workers → db | Event persistence and replay consistency |
| actors → llm → bus | NPC cognition decisions and event emission |

### 3. Error Recovery Not Verified

| System | Gap |
|--------|-----|
| Streaming | Retry backoff, max retry behavior, reconnection |
| LLM | Timeout handling, fallback selection, provider failures |
| DB | Connection recovery, transaction rollback |

## Prioritized Recommendations

### Phase 1: Fix Infrastructure (1-2 hours)

1. **Add missing vitest configs** to bus, characters, generator, llm, projections, retrieval, services
2. **Update vitest.workspace.ts** to include all test-enabled packages
3. **Run `pnpm test` from root** to verify all packages participate

### Phase 2: Frontend Component Tests (4-6 hours)

Priority components for `@minimal-rpg/ui`:

```typescript
// ChatView - most used component
test('renders messages correctly', () => {});
test('handles edit mode flow', () => {});
test('auto-scrolls on new messages', () => {});
test('renders markdown content', () => {});

// BuilderActionPanel - critical for all builders
test('shows delete confirmation modal', () => {});
test('disables save when invalid', () => {});
```

Priority components for `@minimal-rpg/web`:

```typescript
// Character Studio
test('trait inference updates profile', () => {});
test('conversation history persists', () => {});
test('handles LLM errors gracefully', () => {});

// Session Builder
test('creates session with valid data', () => {});
test('validates required fields', () => {});
```

### Phase 3: Correctness Tests (6-8 hours)

Add behavior tests that verify business rules:

```typescript
// Schedule service - verify NPCs are where they should be
test('NPC at tavern during evening shift', () => {
  const npc = createNpcWithSchedule(tavernEveningSchedule);
  const time = createGameTime({ hour: 19 });
  const location = resolveNpcScheduleAtTime(npc, time);
  expect(location).toBe('tavern');
});

// Dialogue service - verify conditions work
test('romantic option requires high relationship', () => {
  const tree = createDialogueTree(romanticBranch);
  const state = { relationship: { npc1: 30 } }; // Below threshold
  const options = getAvailableOptions(tree, state);
  expect(options).not.toContainOption('romantic-advance');
});

// Turn orchestrator - verify game state updates
test('player action updates world state', async () => {
  const session = createTestSession();
  await orchestrator.processTurn(session, 'pick up sword');
  expect(session.inventory).toContainItem('sword');
});
```

### Phase 4: E2E Flows (4-6 hours)

Expand Playwright coverage for critical paths:

```typescript
// test/e2e/session-flow.spec.ts
test('complete game session flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="new-session"]');
  await page.fill('[data-testid="character-select"]', 'Test Character');
  await page.click('[data-testid="start-session"]');

  // Send a message
  await page.fill('[data-testid="chat-input"]', 'Hello world');
  await page.click('[data-testid="send"]');

  // Verify response appears
  await expect(page.locator('[data-testid="message"]')).toHaveCount(2);
});

// test/e2e/builder-flow.spec.ts
test('create and delete location', async ({ page }) => {
  await page.goto('/location-builder');
  await page.click('[data-testid="new-location"]');
  // ... fill form
  await page.click('[data-testid="save"]');
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

  await page.click('[data-testid="delete"]');
  await page.click('[data-testid="confirm-delete"]');
  await expect(page.locator('[data-testid="location-list"]')).not.toContainText('New Location');
});
```

### Phase 5: API Integration Tests (4-6 hours)

Add integration tests that verify API + DB + services work together:

```typescript
// test/integration/session-api.test.ts
test('create session persists to database', async () => {
  const response = await api.post('/sessions', sessionPayload);
  expect(response.status).toBe(201);

  const dbSession = await db.query.sessions.findFirst({
    where: eq(sessions.id, response.body.id),
  });
  expect(dbSession).toBeDefined();
  expect(dbSession.characterId).toBe(sessionPayload.characterId);
});
```

## Test Categories to Add

### Invariant Tests (Schemas Package)

Verify domain rules that must always hold:

```typescript
// Body region hierarchy is consistent
test('all child regions have valid parent', () => {
  for (const region of BODY_REGIONS) {
    if (region.parentId) {
      expect(BODY_REGION_MAP[region.parentId]).toBeDefined();
    }
  }
});

// Personality dimensions are bounded
test('personality dimensions are 0-100', () => {
  const profile = generateCharacter();
  for (const [key, value] of Object.entries(profile.personality)) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }
});
```

### Snapshot Tests (Boundary Schemas)

Verify API contract stability:

```typescript
// Prevent accidental breaking changes to API responses
test('session response shape', () => {
  const session = createMinimalSession();
  expect(session).toMatchSnapshot();
});
```

### Property-Based Tests (Utilities)

For functions with wide input ranges:

```typescript
// fast-check or similar
test.prop([fc.string()])('isUuid rejects non-UUIDs', (input) => {
  // Unless it happens to be a valid UUID format
  if (!UUID_REGEX.test(input)) {
    expect(isUuid(input)).toBe(false);
  }
});
```

## Metrics to Target

| Metric | Current | Target |
|--------|---------|--------|
| Backend unit coverage | ~60% | 80% |
| Frontend component coverage | ~10% | 50% |
| E2E critical path coverage | ~20% | 80% |
| Integration test count | ~5 | 20+ |

## Implementation Order

1. ✅ Fix vitest workspace (infra) - **DONE**
2. Add component tests for ChatView, BuilderActionPanel (high-value)
3. Add schedule-service correctness tests (business logic)
4. Add dialogue-service correctness tests (business logic)
5. Expand Playwright for session flow (E2E)
6. Add API integration tests (integration)
7. Add invariant tests for schemas (contracts)

## Files to Create

```text
# Vitest configs - DONE ✅
packages/bus/vitest.config.ts ✅
packages/characters/vitest.config.ts ✅ (already existed)
packages/generator/vitest.config.ts ✅ (already existed)
packages/llm/vitest.config.ts ✅
packages/projections/vitest.config.ts ✅
packages/retrieval/vitest.config.ts ✅ (already existed)
packages/services/vitest.config.ts ✅

# Component tests - TODO
packages/ui/test/ChatView.test.tsx
packages/ui/test/BuilderActionPanel.test.tsx

# E2E tests - TODO
packages/web/test/e2e/session-flow.spec.ts
packages/web/test/e2e/builder-flow.spec.ts

# Correctness tests - TODO
packages/services/test/schedule-service.correctness.test.ts
packages/services/test/dialogue-service.conditions.test.ts
```

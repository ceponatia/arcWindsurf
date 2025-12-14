# Session Builder & UI Overhaul - Implementation Audit

> **Audit Date**: December 2024
> **Status**: INCOMPLETE - Critical integration missing
> **Branch**: `refactor/opus`

This document provides an **accurate audit** of what has been implemented versus what was planned in [opus-refactor.md](opus-refactor.md), cross-referenced against the requirements in [opus-session-builder-and-ui-overhaul.md](opus-session-builder-and-ui-overhaul.md).

---

## Executive Summary

**CRITICAL FINDING**: The new Session Workspace components exist but are **NOT wired into the application**. The old `SessionBuilder` is still used in the UI routing.

| Phase | Planned Items | Implemented | Wired/Functional | Status                          |
| ----- | ------------- | ----------- | ---------------- | ------------------------------- |
| 0     | 10            | 10          | 10               | ✅ Complete                     |
| 1     | 26            | 20          | **0**            | 🔴 **Built but not integrated** |
| 2     | 21            | 14          | **0**            | 🔴 **Built but not integrated** |
| 3     | 9             | 6           | **0**            | 🔴 **Partial**                  |
| 4     | 11            | 4           | 4                | 🟡 Partial                      |
| 5     | 9             | 9           | 9                | ✅ Complete                     |
| 6     | 7             | 5           | 5                | 🟡 Partial                      |
| 7     | 11            | 6           | 6                | 🟡 Partial                      |

---

## Phase 0: Critical Foundations ✅ COMPLETE

### 0.1 Fix Persona Builder Save Errors ✅

| Item                            | Status | Evidence                    |
| ------------------------------- | ------ | --------------------------- |
| Debug and identify root cause   | ✅     | Fixed in previous sessions  |
| Fix API endpoint/validation     | ✅     | Persona CRUD works          |
| Add error handling and feedback | ✅     | PersonaBuilder shows errors |
| Verify persona in LLM context   | ✅     | Personas loaded in sessions |

### 0.2 Transactional Session Creation API ✅

| Item                                    | Status | Evidence                                                                          |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Create `/sessions/create-full` endpoint | ✅     | [session-create-full.ts](packages/api/src/routes/sessions/session-create-full.ts) |
| Implement transactional creation        | ✅     | Uses PostgreSQL transaction                                                       |
| Return complete session state           | ✅     | Returns `CreateFullSessionResponse`                                               |
| Add validation for nested entities      | ✅     | Zod schema with 39 integration tests                                              |

### 0.3 Draft Persistence Schema ✅

| Item                                            | Status | Evidence                                                                               |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Create migration for `session_workspace_drafts` | ✅     | [015_workspace_drafts.sql](packages/db/sql/015_workspace_drafts.sql)                   |
| Create API endpoints                            | ✅     | [workspaceDrafts.ts](packages/api/src/routes/workspaceDrafts.ts) - GET/POST/PUT/DELETE |
| Add auto-cleanup for stale drafts               | ✅     | `deleteStaleWorkspaceDrafts()` in sessions.ts                                          |

---

## Phase 1: Session Workspace Foundation 🔴 BUILT BUT NOT INTEGRATED

### Critical Issue: Not Wired to UI

**Problem**: The `SessionWorkspace` component exists at `packages/web/src/features/session-workspace/` but `AppShell.tsx` still uses the **old** `SessionBuilder`:

```typescript
// AppShell.tsx line ~500 - STILL USING OLD BUILDER
case 'session-builder':
  return (
    <SessionBuilder .../>  // OLD component from session-builder/
  );
```

**Fix Required**: Replace `SessionBuilder` import with `SessionWorkspace` and update props.

### 1.1 Workspace Shell & Navigation

| Item                                               | Status                 | Evidence                                                                                 |
| -------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| Create `SessionWorkspace.tsx` with step navigation | ✅ Built               | [SessionWorkspace.tsx](packages/web/src/features/session-workspace/SessionWorkspace.tsx) |
| Implement Zustand store                            | ✅ Built               | [store.ts](packages/web/src/features/session-workspace/store.ts) - 450 lines             |
| Add localStorage persistence middleware            | ✅ Built               | Uses `persist` middleware                                                                |
| Add server sync middleware                         | 🔴 **NOT IMPLEMENTED** | Comment says "TODO: Implement auto-save to server"                                       |
| Non-linear navigation                              | ✅ Built               | `setStep()` allows any step                                                              |
| Completed steps show checkmarks                    | ✅ Built               | `StepNavigation` component                                                               |

### 1.2 State Management (Zustand Store) ✅

| Item                                      | Status                 | Evidence                          |
| ----------------------------------------- | ---------------------- | --------------------------------- |
| Implement Zustand store with types        | ✅                     | Full TypeScript types defined     |
| Add `persist` middleware for localStorage | ✅                     | `persist()` middleware configured |
| Add custom `syncToServer` middleware      | 🔴 **NOT IMPLEMENTED** | Only localStorage, no API sync    |
| Add step change auto-save trigger         | 🔴 **NOT IMPLEMENTED** | No auto-save on step change       |

### 1.3 Power User Mode (Compact Builder)

| Item                                    | Status                 | Evidence                                                                             |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Create `CompactBuilder.tsx`             | ✅ Built               | [CompactBuilder.tsx](packages/web/src/features/session-workspace/CompactBuilder.tsx) |
| Two-panel layout                        | ✅ Built               | Grid layout with selectors + summary                                                 |
| Default to Compact Mode for 3+ sessions | 🔴 **NOT IMPLEMENTED** | Always defaults to wizard                                                            |
| Store mode preference                   | 🟡 Partial             | Stored in localStorage, not user settings                                            |

### 1.4-1.8 Step Components

| Component             | Built | Functional   | Evidence                        |
| --------------------- | ----- | ------------ | ------------------------------- |
| SettingStep.tsx       | ✅    | ❌ Not wired | Exists but not accessible in UI |
| NpcsStep.tsx          | ✅    | ❌ Not wired | Exists but not accessible in UI |
| PlayerStep.tsx        | ✅    | ❌ Not wired | Exists but not accessible in UI |
| TagsStep.tsx          | ✅    | ❌ Not wired | Exists but not accessible in UI |
| ReviewStep.tsx        | ✅    | ❌ Not wired | Exists but not accessible in UI |
| LocationsStep.tsx     | ✅    | ❌ Not wired | Exists but not accessible in UI |
| RelationshipsStep.tsx | ✅    | ❌ Not wired | Exists but not accessible in UI |

**Missing Features in Step Components:**

- TimeConfigEditor not implemented (SettingStep)
- Genre presets not implemented
- Quick-create forms are stubs
- Navigation to full builders not implemented

---

## Phase 2: Location System 🔴 BUILT BUT NOT INTEGRATED

### 2.1 Location Data Model ✅

| Item                                      | Status | Evidence                                                       |
| ----------------------------------------- | ------ | -------------------------------------------------------------- |
| Create migration for `location_maps`      | ✅     | [016_location_maps.sql](packages/db/sql/016_location_maps.sql) |
| Create `locations` table with named exits | ✅     | Included in migration                                          |
| Create `location_connections` table       | ✅     | Included in migration                                          |
| Create API endpoints                      | ✅     | `/location-maps` CRUD exists                                   |

### 2.2 Location Builder UI ✅ Built

| Item                         | Status   | Evidence                                                                                          |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Create `LocationBuilder.tsx` | ✅ Built | [LocationBuilder.tsx](packages/web/src/features/location-builder/LocationBuilder.tsx)             |
| Tab 1: Hierarchy View        | ✅ Built | [HierarchyTree.tsx](packages/web/src/features/location-builder/HierarchyTree.tsx)                 |
| Tab 2: Graph View            | ✅ Built | [GraphView.tsx](packages/web/src/features/location-builder/GraphView.tsx)                         |
| React Flow integration       | ✅ Built | Uses @xyflow/react                                                                                |
| Custom node component        | ✅ Built | [LocationNodeComponent.tsx](packages/web/src/features/location-builder/LocationNodeComponent.tsx) |
| Semantic zoom                | ✅ Built | `zoomLevel` filter in store                                                                       |

**NOT WIRED**: LocationBuilder not accessible from main navigation.

### 2.3 Prefab System 🔴 NOT IMPLEMENTED

| Item                             | Status |
| -------------------------------- | ------ |
| Create `location_prefabs` table  | ❌     |
| Prefab = saved location subgraph | ❌     |
| "Save as Prefab" action          | ❌     |
| Prefab library in builder        | ❌     |
| Drop prefab → pick entry point   | ❌     |

### 2.4-2.6 Other Location Features

| Item                             | Status             | Evidence                                |
| -------------------------------- | ------------------ | --------------------------------------- |
| Location Quick-Add modal         | ✅                 | AddLocationModal in LocationBuilder     |
| Template selection pre-fills     | 🔴 Not implemented | No templates                            |
| Travel time in schema            | ✅                 | `travelMinutes` in `LocationConnection` |
| Governor travel time integration | 🔴 Not verified    | No evidence of time advancement         |
| LocationsStep in workspace       | ✅ Built           | File exists, not wired                  |

---

## Phase 3: Relationships & Scoped Tags 🟡 PARTIAL

### 3.1 Relationship Data Model

| Item                                    | Status | Evidence                                                                         |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Create migration for relationship state | ✅     | [013_session_affinity_state.sql](packages/db/sql/013_session_affinity_state.sql) |
| API endpoints for relationship CRUD     | 🟡     | Affinity API exists, not full relationship API                                   |
| Default relationship = "stranger"       | ✅     | RELATIONSHIP_PRESETS in RelationshipsStep                                        |

### 3.2 Relationship Matrix UI ✅

| Item                            | Status      | Evidence                                 |
| ------------------------------- | ----------- | ---------------------------------------- |
| Create `RelationshipMatrix.tsx` | ✅          | Actually in RelationshipsStep.tsx        |
| Matrix view for small casts     | ✅          | `MatrixView` component                   |
| List view for larger casts      | ✅          | `ListView` component with auto-switch    |
| Click cell → dropdown presets   | ✅          | RELATIONSHIP_PRESETS with affinity seeds |
| Visual relationship graph       | ❌ Deferred | As planned                               |

### 3.3 Scoped Tags Implementation

| Item                                   | Status                 | Evidence                                            |
| -------------------------------------- | ---------------------- | --------------------------------------------------- |
| Update tag schema with `target` field  | ✅                     | `SessionTagInstance` in schemas                     |
| Update tag selection UI with scope     | ✅                     | TagsStep has scope dropdown                         |
| Update Governor to inject session tags | ✅                     | `buildSessionTagsContext()` in tool-turn-handler.ts |
| Update NPC agents for per-NPC tags     | 🔴 **NOT IMPLEMENTED** | No evidence in agents package                       |

---

## Phase 4: Character Builder Progressive Disclosure 🟡 PARTIAL

### 4.1 Tiered Complexity Modes ✅

| Item                                       | Status | Evidence                                |
| ------------------------------------------ | ------ | --------------------------------------- |
| Add mode selector to CharacterBuilder      | ✅     | `CharacterBuilderMode` type in types.ts |
| Implement section visibility based on mode | ✅     | `MODE_CONFIGS` defines visible sections |
| Preserve data when switching modes         | ✅     | Data not lost on mode change            |
| Default to Standard mode                   | ✅     | `initialMode` defaults to 'standard'    |

### 4.2-4.4 Templates & Auto-Fill 🔴 NOT IMPLEMENTED

| Item                                | Status |
| ----------------------------------- | ------ |
| Create `character_templates` table  | ❌     |
| Seed initial templates              | ❌     |
| Template selector UI                | ❌     |
| `expand_character_profile` LLM tool | ❌     |
| Per-section "Regenerate" buttons    | ❌     |
| Transient NPC templates table       | ❌     |
| Transient NPC builder               | ❌     |

---

## Phase 5: Dynamic Hygiene & Sensory System ✅ COMPLETE

### 5.1 Hygiene State Model ✅

| Item                              | Status | Evidence                                                               |
| --------------------------------- | ------ | ---------------------------------------------------------------------- |
| Create `npc_hygiene_state` table  | ✅     | [017_npc_hygiene_state.sql](packages/db/sql/017_npc_hygiene_state.sql) |
| Default all body parts at level 0 | ✅     | `createInitialHygieneState()` in schemas                               |
| Character builder hygiene config  | ✅     | Advanced mode has hygiene section                                      |

### 5.2 Sensory Modifier Data File ✅

| Item                               | Status | Evidence                               |
| ---------------------------------- | ------ | -------------------------------------- |
| Create sensory modifiers data file | ✅     | `SENSORY_MODIFIER_DEFAULTS` in schemas |
| Loader function                    | ✅     | Schema exports loader                  |
| Validation schema                  | ✅     | Zod schemas for hygiene state          |

### 5.3-5.4 Hygiene Update & Sensory Description ✅

| Item                             | Status | Evidence                                     |
| -------------------------------- | ------ | -------------------------------------------- |
| Create `update_npc_hygiene` tool | ✅     | `NpcHygieneStateSchema` and update functions |
| Activity modifiers               | ✅     | `ACTIVITY_MODIFIERS` defined                 |
| Clothing modifiers               | ✅     | `FOOTWEAR_MODIFIERS` defined                 |
| Sensory description function     | ✅     | `getSensoryDescription()` in schemas         |

---

## Phase 6: Schedule Templates & NPC Location 🟡 PARTIAL

### 6.1 Schedule Template Model ✅

| Item                              | Status                 | Evidence                                                                 |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| Create `schedule_templates` table | ✅                     | [018_schedule_templates.sql](packages/db/sql/018_schedule_templates.sql) |
| Seed default templates            | ✅                     | `SCHEDULE_TEMPLATES` array with 5 templates                              |
| Schedule template builder UI      | 🔴 **NOT IMPLEMENTED** | No UI component                                                          |

### 6.2-6.3 LLM Schedule Assignment 🔴 NOT IMPLEMENTED

| Item                         | Status                        |
| ---------------------------- | ----------------------------- |
| `generate_npc_schedule` tool | ❌                            |
| `assign_npc_location` tool   | ❌                            |
| Use in Session Workspace     | ❌ (workspace not integrated) |

---

## Phase 7: Polish & Integration Testing 🟡 PARTIAL

### 7.1 Cross-Entity Linking

| Item                          | Status                 | Evidence                     |
| ----------------------------- | ---------------------- | ---------------------------- |
| Add usage tracking            | 🟡                     | Some counts in API responses |
| "Where is this used?" section | 🔴 **NOT IMPLEMENTED** | No UI component              |
| Reverse navigation            | 🔴 **NOT IMPLEMENTED** | No evidence                  |

### 7.2 Backend Integration

| Item                              | Status                 | Evidence                                  |
| --------------------------------- | ---------------------- | ----------------------------------------- |
| Wire location data to LLM context | 🟡                     | Location exists in context but incomplete |
| Implement NPC scheduling          | 🟡                     | Schema exists, runtime unclear            |
| Time advancement on travel        | 🔴 **NOT VERIFIED**    | No evidence in Governor                   |
| Tag injection to Governor         | ✅                     | `buildSessionTagsContext()`               |
| Tag injection to NPC agents       | 🔴 **NOT IMPLEMENTED** | No per-NPC tag injection                  |

### 7.3 Testing & Validation ✅

| Item                                   | Status      | Evidence                  |
| -------------------------------------- | ----------- | ------------------------- |
| Unit tests for workspace state         | ✅          | 26 tests in web package   |
| Integration tests for session creation | ✅          | 39 tests in API package   |
| E2E tests for session flow             | ✅          | Validated with Playwright |
| User testing                           | ❌ Deferred | As planned                |
| Performance profiling                  | ❌ Deferred | As planned                |

---

## Summary: What Needs To Be Done

### Critical (Blocking)

1. **Wire SessionWorkspace to AppShell.tsx** - Replace old SessionBuilder import
2. **Add server sync middleware** - Store saves to localStorage but not to `/workspace-drafts` API
3. **Wire LocationBuilder to navigation** - Built but not accessible

### High Priority

4. Complete step component navigation callbacks (onNavigateToSettingBuilder, etc.)
5. Implement TimeConfigEditor for SettingStep
6. Implement auto-save on step change
7. Test new workspace flow end-to-end after wiring

### Medium Priority

8. Per-NPC tag injection in agents
9. Schedule template builder UI
10. Location prefab system
11. Character templates

### Low Priority / Future

12. Visual relationship graph editor
13. Location-scoped tags (requires Governor location detection)
14. LLM schedule/location assignment tools
15. "Where is this used?" cross-entity linking

---

## Files Requiring Changes

### To Wire SessionWorkspace

```text
packages/web/src/layouts/AppShell.tsx
  - Import SessionWorkspace instead of SessionBuilder
  - Update props passed to component
  - Add 'session-workspace' viewMode case

packages/web/src/layouts/hooks/useAppController.ts
  - May need navigation handlers for workspace flow
```

### To Complete Server Sync

```text
packages/web/src/features/session-workspace/store.ts
  - Add syncToServer middleware
  - Call /workspace-drafts API on debounced interval
  - Call on step change
```

---

## Appendix: File Inventory

### Session Workspace (Built, Not Wired)

```text
packages/web/src/features/session-workspace/
├── index.ts
├── store.ts                  # Zustand store with localStorage
├── SessionWorkspace.tsx      # Main workspace component
├── CompactBuilder.tsx        # Power user compact mode
└── steps/
    ├── index.ts
    ├── SettingStep.tsx
    ├── LocationsStep.tsx
    ├── NpcsStep.tsx
    ├── PlayerStep.tsx
    ├── TagsStep.tsx
    ├── RelationshipsStep.tsx
    └── ReviewStep.tsx
```

### Location Builder (Built, Not Wired)

```text
packages/web/src/features/location-builder/
├── index.ts
├── types.ts
├── store.ts
├── LocationBuilder.tsx
├── HierarchyTree.tsx
├── GraphView.tsx
└── LocationNodeComponent.tsx
```

### Old Session Builder (Still In Use)

```text
packages/web/src/features/session-builder/
├── index.ts
└── SessionBuilder.tsx        # STILL USED BY AppShell.tsx
```

# Documentation Analysis Findings

This document summarizes gaps, conflicts, and potential issues identified in the `dev-docs/` directory as of December 2, 2025.

## 1. Implementation Gaps (Documented vs. Codebase)

The documentation describes a sophisticated architecture (Governor, RAG, State Manager) that is largely "scaffolded" or "proposed" and not yet active in the runtime. While the docs are generally honest about this, the volume of "future" documentation outweighs the "current" documentation, which can be confusing.

- **Governor & Agents:** `11-governor-and-agents.md` and `13-agent-io-contracts.md` describe a complex orchestration layer. The codebase only contains a scaffold (`packages/governor/src/governor.ts`) that echoes input.
- **RAG & Embeddings:** `08-knowledge-node-model.md`, `09-retrieval-and-scoring.md`, and `16-rag-context-injection.md` detail a vector-based retrieval system. The codebase only has the `pgvector` extension enabled; no embedding generation, storage, or retrieval logic exists.
- **State Manager:** `12-state-manager-and-embedding-lifecycle.md` describes a state manager that is not wired into the API or Governor.
- **Items & Inventory:** `06-items-inventory-and-outfits.md` describes an item system that does not exist in the DB or API.
- **Locations:** `05-locations-schema.md` describes location schemas (`Region`, `Building`, `Room`). These exist in `packages/schemas/src/location/`, but there is no persistence layer or runtime usage.

## 2. Conflicts and Inconsistencies

- **Location Schemas:**
  - `01-domain-model-overview.md` states: "no map schemas ... in the codebase".
  - `05-locations-schema.md` correctly identifies that schemas exist in `packages/schemas/src/location/`.
  - _Resolution:_ The overview likely meant "no map _persistence_ schemas" or "no _navigation_ schemas", but the phrasing is contradictory.
- **Todo List Ambiguity:**
  - `todo.md` contains the item: "create updated versions of core dev-docs files which now are based on the RAG governance system".
  - The current docs _do_ describe this system, but as "proposed". It is unclear if the todo means "write the design docs" (done) or "update the docs to reflect the system _as implemented_" (impossible, as it's not implemented).

## 3. Erroneous or Outdated Information

- **General Status:** The docs are highly forward-looking. A developer reading `13-agent-io-contracts.md` might assume a level of system maturity that does not exist. The "Current Status" sections are crucial and generally accurate, but the sheer weight of proposed features obscures the actual runtime behavior.

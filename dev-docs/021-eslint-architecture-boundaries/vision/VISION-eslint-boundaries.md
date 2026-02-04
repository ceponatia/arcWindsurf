# Vision: ESLint Architecture Boundaries

## Goal

Establish automated guardrails that prevent architectural drift and enforce clean package boundaries in the monorepo.

## Why This Matters

As the codebase grows, it's easy to:

- Create schemas in arbitrary packages instead of `@minimal-rpg/schemas`
- Import from package internals instead of public APIs
- Create circular dependencies between packages
- Bypass the service layer to access DB directly
- Scatter environment config access throughout the codebase

Manual code review catches some of these, but automated lint rules catch them all before merge.

## Success Criteria

1. **Zero deep imports** - All `@minimal-rpg/*` imports use public API
2. **Zero cross-package relative paths** - All cross-package imports use namespace
3. **Schemas centralized** - All exported Zod schemas in `@minimal-rpg/schemas`
4. **Layer boundaries enforced** - Lower layers can't import from higher layers
5. **DB access controlled** - Only designated packages access DB directly
6. **Config centralized** - `process.env` only in config modules

## Expected Outcomes

- New developers can't accidentally violate architecture
- PRs automatically flagged for boundary violations
- Dependency graph stays clean and understandable
- Package responsibilities remain clear
- Easier to reason about code ownership

## Non-Goals

- Preventing all coupling (some coupling is necessary)
- Enforcing specific patterns within packages
- Replacing code review for architectural decisions

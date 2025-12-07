# Session Instances

Session-scoped profile instance management with override support.

## Overview

Handles per-session copies of character and setting profiles that can be customized with overrides without modifying the original templates.

## Key Concepts

- **Template** — The original character/setting profile (read-only reference)
- **Instance** — A session-specific copy that can have overrides applied
- **Overrides** — Partial updates merged onto the instance using deep merge (arrays replaced, objects recursively merged)

## Exports

- `getEffectiveCharacter(sessionId, character)` — Returns the merged character profile for a session
- `getEffectiveSetting(sessionId, setting)` — Returns the merged setting profile for a session
- `getEffectiveProfiles(sessionId, character, setting)` — Returns both effective profiles
- `upsertCharacterOverrides(params)` — Applies overrides to a character instance
- `upsertSettingOverrides(params)` — Applies overrides to a setting instance
- `deepMergeReplaceArrays(base, override)` — Utility for merging with array replacement semantics

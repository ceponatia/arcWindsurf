# @minimal-rpg/shared

Shared utilities and types for Minimal RPG.

Exports

- `CharacterProfileSchema`, `SettingProfileSchema`: re-exported Zod schemas from `@minimal-rpg/schemas`.
- `CharacterProfile`, `SettingProfile`: inferred TypeScript types (re-exported) for convenience.

Note: Prefer importing schemas and types directly from `@minimal-rpg/schemas` in new code. This package re-exports them for compatibility.

Notes

- Character profiles support optional `style` hints to shape narration:
  - `sentenceLength`: `terse` | `balanced` | `long`
  - `humor`: `none` | `light` | `wry` | `dark`
  - `darkness`: `low` | `medium` | `high`
  - `pacing`: `slow` | `balanced` | `fast`
  - `formality`: `casual` | `neutral` | `formal`
  - `verbosity`: `terse` | `balanced` | `lavish`

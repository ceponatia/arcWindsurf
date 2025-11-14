# Data directory

This repository includes runtime content the API loads on startup. Place JSON files in the following locations:

- `data/characters/*.json` — Character profile documents (one per file)
- `data/settings/*.json` — Setting profile documents (one per file)

Each file must be valid JSON and conform to the shared Zod schemas (see `@minimal-rpg/schemas`).

Minimum expectations:

- `id`: non-empty string identifier
- `name`: 1..80 character name
- `summary`, `backstory`, `personality`, `lore`, `tone`: non-empty strings
- `goals`: array of non-empty strings (for characters)
- `tags`: optional array of strings
- `constraints`: optional array of strings (for settings)
- `style`: optional object to hint narration style (for characters)
  - `sentenceLength`: `terse` | `balanced` | `long`
  - `humor`: `none` | `light` | `wry` | `dark`
  - `darkness`: `low` | `medium` | `high`
  - `pacing`: `slow` | `balanced` | `fast`
  - `formality`: `casual` | `neutral` | `formal`
  - `verbosity`: `terse` | `balanced` | `lavish`
- `appearance`: optional object describing physical traits
  - `hair.color` | `hair.style` | `hair.length`: strings
  - `eyes.color`: string
  - `heightCm`: positive integer (max 300)
  - `build`: `slight` | `average` | `athletic` | `heavy`
  - `features`: array of strings
  - `description`: string

Tips

- Keep each JSON file small and focused; the API will parse and validate all files at startup.
- When adding new files, follow the field names exactly and ensure JSON parseability.
- For stricter validation or examples, look into `@minimal-rpg/schemas` for the Zod schemas.
- On server startup, invalid files cause a fail-fast exit with a validation error pointing to the offending file and field; fix and restart.

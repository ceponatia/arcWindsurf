# Data Loader

Loads and validates character and setting profiles from JSON files on disk.

## Overview

- Reads JSON files from `data/characters/` and `data/settings/` directories
- Validates files against Zod schemas (`CharacterProfileSchema`, `SettingProfileSchema`)
- Fails fast with informative errors if validation fails
- Uses `DATA_DIR` environment variable or auto-discovers the nearest `data/` folder

## Exports

- `loadData(dataDir?)` — Loads all character and setting profiles, returns `LoadedData`
- `resolveDataDir(dataDir?)` — Resolves the data directory path
- `deleteCharacterFile(id, dataDir?)` — Removes a character JSON file by ID

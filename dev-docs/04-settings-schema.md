# Settings Schema

This document outlines the data structures used to represent the high-level world and environment in Minimal RPG.

## Setting Profile Schema

The `SettingProfile` represents the high-level world or scenario context for a session. It sets the tone, lore, and rules of the world.

**Source:** `packages/schemas/src/setting/index.ts`

### Core Fields (`SettingBackground`)

| Field    | Type     | Required | Description                                   |
| :------- | :------- | :------- | :-------------------------------------------- |
| `id`     | string   | Yes      | Unique identifier (slug or UUID).             |
| `name`   | string   | Yes      | Display name (max 80 chars).                  |
| `lore`   | string   | Yes      | Primary narrative description and history.    |
| `themes` | string[] | No       | Thematic keywords (e.g., "betrayal", "hope"). |
| `tags`   | enum[]   | No       | System tags affecting prompt rules.           |

**Supported Tags:**
`romance`, `adventure`, `mystery`, `dirty`.

## Data Persistence

### Settings

Settings follow the same persistence model as Characters:

1. **Static Templates**: JSON files in `data/settings/`. Validated at server startup.
2. **Dynamic Templates**: Rows in the `setting_profiles` table. Created via API.
3. **Session Instances**: Rows in the `setting_instances` table.
   - Created when a session starts.
   - Contains a snapshot of the template (`template_snapshot`) and the current mutable state (`profile_json`).
   - Overrides are applied to `profile_json`.

## TBD / Open Questions

- **Thematic Tags**: Do we need more granular tags to affect prompt rules or content filters?
- **Setting Variants**: How will alternate versions of the same setting (e.g., different eras or timelines) be represented?
- **Integration with Locations**: How tightly coupled should settings be to location structures defined in the Locations Schema?

# Plan: Mutable Session Objects

## Goal

When a new session is started, create mutable copies of the selected character and setting in the database. The session will reference these copies instead of the original (potentially file-based or immutable) profiles. This allows for session-specific evolution of the character/setting without affecting the originals or other sessions.

## Implementation Steps

### 1. Modify Session Creation Logic

**File:** `packages/api/src/routes/sessions.ts`

In the `POST /sessions` handler:

1.  **Retrieve Source Profiles**: Continue to use `findCharacter` and `findSetting` to load the requested character and setting profiles (from file or DB).
2.  **Generate New IDs**: Generate unique IDs for the session-specific copies (e.g., using `safeRandomId()`).
    - The random number could be appended to the existing, original ID so that it is still obvious where the copy originated.
3.  **Create Copies**:
    - Create a copy of the character profile object.
    - Update its `id` field to the new character ID.
    - Create a copy of the setting profile object.
    - Update its `id` field to the new setting ID.
4.  **Persist Copies**:
    - Insert the new character profile into the `character_templates` table via `db.characterTemplate.create`.
    - Insert the new setting profile into the `setting_templates` table via `db.settingTemplate.create`.
5.  **Create Session**:
    - Call `createSession` using the _new_ IDs.

### 2. Verify Behavior

- Start a new session via the API/UI.
- Verify that `user_sessions` table references the new IDs.
- Verify that new records exist in `character_templates` and `setting_templates`.
- Verify that the original character/setting is unchanged.
- Verify that `getEffectiveProfiles` works correctly with the new IDs.

## Considerations

- **Data Growth**: This approach creates a full copy of the profile for every session. Given the text-based nature of the profiles, this is acceptable for now but might need cleanup strategies later (e.g., deleting templates when the session is deleted).
- **Overrides**: The existing `character_instances` and `setting_instances` tables (used for overrides) will now reference the _copy_. This is correct behavior. The "baseline" for the instance will be the copy.
- **Future Proofing**: When we later implement `items`, `locations`, etc., these will have the same functionality. We might consider abstracting the copy logic into a reusable function.

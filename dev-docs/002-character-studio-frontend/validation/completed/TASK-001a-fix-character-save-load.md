# TASK-001a: Fix character save/load flow

## Summary

- Save from Character Studio UI fails with HTTP 400 because required fields (`id`, `backstory`, `personality`) are missing from the payload; these fields are not present in the UI and have no defaults applied before calling POST /characters.
- Loading a newly created character fails: GET /characters/:id returns 404 even though the character appears in the /characters list (saved in DB). Character Studio shows a console error and cannot populate the profile from the API.

## Environment

- API: localhost:3002 (pnpm -F @minimal-rpg/api dev, Postgres via Docker)
- Web: localhost:5173 (pnpm -F @minimal-rpg/web dev --host)
- Browser: Playwright-driven (<http://localhost:5173/#/character-studio>)

## Repro Steps

1. Navigate to Characters → + New Character.
2. Fill only available fields (Name, Age, Summary) and click Save Character.
3. Observe POST /characters 400 response. API error body: missing `id`, `backstory`, `personality` (from CharacterProfileSchema).
4. Manually inject required fields via console and POST (works, 201 Created). The character appears in /characters list.
5. Click the character entry to load it. GET /characters/{id} responds 404; UI logs "Failed to load character: HTTP 404" and fields are not loaded from API.

## Evidence

- POST /characters 400 error body:

  ```json
  {"ok":false,"error":{"formErrors":[],"fieldErrors":{"id":["Invalid input: expected string, received undefined"],"backstory":["Invalid input: expected string, received undefined"],"personality":["Invalid input"]}}}
  ```

- Manual POST (with id/backstory/personality) succeeded: 201 Created, response included character summary.
- GET /characters/{id} for the saved UUID returned 404 `{"ok":false,"error":"not found"}` while /characters list returned the same id twice.
- UI console: `Failed to load character: Error: HTTP 404` after clicking the saved character in the Characters list.

## Expected

- Save should succeed with defaults or required fields exposed in the UI.
- Loading a saved character should return 200 with the stored profile.

## Actual

- Save fails 400 due to missing required fields.
- Detail load endpoint returns 404; Character Studio cannot load saved character data.

## Impact

- Cannot complete end-to-end save/load flow for Character Studio (Task-001 verification blocked).

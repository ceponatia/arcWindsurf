# Copilot Instructions for Minimal RPG

## Important

- Use the Github MCP for github related operations.
- Always break code files into small domain-focused modules in their own files and folders. Each folder should have domain-specific types.ts files.
- Identify if types you are adding can be used across domains; if so, add them to the types.ts file in that package's src/types.ts file as shared types.
- Read the relevant domain's README.md files for package-specific info.
- Markdown file code fences require a language tag. If you are not using a language tab (trees or other notes in structured format), use `text`.

## Developer Workflows

- Install/build all: `pnpm -w install` then `pnpm -w build` (Turbo runs `tsc` into `dist/`).
- Rebuild docker container when necessary (e.g., after dependency changes, updates to db, migrations, api changes): `docker compose build`.
- Typecheck + lint: prefer `pnpm -w typecheck` / `pnpm -w lint`.

## Patterns to Follow

- Use shared Zod schemas for runtime validation; avoid duplicate type definitions.
- Do not write functional code in schema files—keep them focused on data structure.
- Use explicit types for function parameters and return values for clarity.
- Write small, focused functions that do one thing well.
- Use async/await for asynchronous code; avoid mixing with .then()/.catch().
- Handle errors gracefully with try/catch and provide meaningful messages.
- Write JSDoc comments for all functions and complex logic.
- Use the standard ASCII '-' for hyphens and dashes in source and documentation; avoid typographic variants like '–', '—', or non-breaking hyphens.

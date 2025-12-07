# API Schemas

Zod schemas for API request/response validation and prompt configuration.

## Files

| File                     | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `promptConfig.ts`        | Loader and validator for prompt JSON configuration files  |
| `promptConfigSchemas.ts` | Schemas for system prompts, safety rules, and safety mode |
| `tags.ts`                | CRUD request/response schemas for the tags API            |

## Prompt Configuration

Validates JSON configuration files for the LLM prompt system:

- **SystemPromptSchema** — Base narrative rules (`rules: string[]`)
- **SafetyRulesSchema** — Content safety rules (`rules: string[]`)
- **SafetyModeSchema** — Safety mode messages for filtered content

## Tag API Schemas

Request and response types for tag management:

- `CreateTagRequestSchema` / `UpdateTagRequestSchema` — Tag CRUD
- `TagQuerySchema` — Filtering options for tag lists
- `CreateTagBindingRequestSchema` — Bind tags to sessions
- `TagBindingWithDefinitionSchema` — Joined binding + tag definition

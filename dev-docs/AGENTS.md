# Instructions for dev-docs

## Style

- Follow the rules set in [markdownlint.json](../markdownlint.json)
- When writing code blocks that don't have a language specified, use `text`

## Folders

- Top level folders should be consecutively numbered and then have a short descriptive name
  - Example: `001-getting-started/`, `002-architecture/`
- Inside each folder is a plan, vision, and tasks folder
  - Plan contains design docs, architecture decisions, and research
  - Status contains progress reports, retrospectives, and meeting notes
- Each task file should be named with a consistent pattern: `TASK-<three-digit-number>-<short-description>.md`
  - Example: `TASK-001-setup-monorepo.md`
    - Tasks contains one task file per deliverable in the plan documents
    - A checklist of acceptance criteria should be included in each task as the last section in the file.
- Other folders can exist for specific domains (e.g., `agents/`, `vision/`, `tutorials/`)

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
  - Tasks contains user stories, issues, and project management artifacts
- Other folders can exist for specific domains (e.g., `agents/`, `vision/`, `tutorials/`)

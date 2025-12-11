# Persona System Prompt

The [Persona Package](../../packages/schemas/src/persona/) defines the structure and attributes of buildable user personas that players use to represent themselves to the LLM storyteller and npc-agents.

## TASKS

- Use the shared ui components and utils in [The UI Package](../../packages/ui/) and [the Utils package](../../packages/utils/) wherever possible to maintain consistency across the application.
- Always use shared/reusable TypeScript types in a domain-scoped types.ts file in each feature or package to avoid duplication and ensure type safety.

1. Examine the [Character Package](../../packages/schemas/src/character/) to understand how the characters schema is connected to the api, db, governor, and agents packages because the persona schema will need to be similarly connected.
2. Connect the persona schema to the api, db, governor, and agents packages. Note that the sensory-agent and npc-agent do not need access to the db fields for personas, but the governor (which writes the final response from responses returned by the npc-agent and sensory-agent) will need to read from the persona data to properly give the governor context about the player's appearance, background, and personality.
3. Update the governor to read from the persona data when constructing prompts for the npc-agent and sensory-agent.
4. Build a character-builder feature in [the web client](../../packages/web/src/features/persona-builder/) that allows players to create and edit their personas. This should include fields for appearance, background, personality traits, and any other relevant attributes defined in the persona schema. The folder structure and file names should follow the conventions used in the existing character-builder feature.
5. Build a persona-panel feature in [the web client](../../packages/web/src/features/persona-panel/) that mirrors the structure and functionality of the characters-panel feature, allowing players to view and manage their created personas.
6. Make a pass over imports and exports in all modified and newly created files to ensure they are clean, organized, and free of unused references.

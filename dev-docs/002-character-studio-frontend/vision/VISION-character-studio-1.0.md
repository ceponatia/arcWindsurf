# Character Studio 1.0 Vision

**Status**: Active
**Created**: January 12, 2026
**Prerequisite**: 001-world-bus-backend (Complete)

---

## What is Character Studio?

Character Studio is an interactive tool for creating rich, personality-driven NPCs. Users define a character through structured forms and natural conversation, with AI assistance to suggest personality traits based on how the character responds.

---

## The User Experience

### Starting Out

A user opens Character Studio to create a new NPC for their game world. They're presented with a clean interface split into two panels:

- **Left Panel**: Identity forms organized as collapsible cards
- **Right Panel**: Conversation area for "interviewing" the character

### Building Identity

The left panel contains cards for each aspect of the character:

1. **Basic Info** - Name, age, summary
2. **Backstory** - The character's history and background
3. **Classification** - Race, alignment, tier (game-specific metadata)
4. **Personality Dimensions** - Big Five traits via sliders
5. **Emotional Baseline** - Default emotional state
6. **Values & Motivations** - What drives them
7. **Fears & Triggers** - What threatens them
8. **Social Patterns** - How they interact with others
9. **Voice & Communication** - Speech style and vocabulary
10. **Stress Response** - Behavior under pressure
11. **Body & Appearance** - Physical characteristics

Cards collapse to save space. A completion indicator shows how much of the profile is filled.

### Conversation Discovery

The right panel lets users "talk" to the character. The AI responds in character based on the current profile. As the conversation reveals personality traits, the system suggests additions:

> "Based on Elara's guarded response to questions about her past, she may have **Trust Issues (guarded with strangers)**. Accept this trait?"

Users can accept, modify, or dismiss suggestions. Accepted traits automatically populate the left panel forms.

### Saving and Loading

Characters persist to the database. Users can:

- Save progress at any time
- Load existing characters for editing
- See a list of all created characters

---

## Key Principles

### Progressive Disclosure

Not everything needs to be visible at once. Cards start collapsed, showing only the most essential fields. Power users can expand all sections; casual users fill in what matters to them.

### AI as Assistant, Not Author

The AI suggests traits but doesn't impose them. Users always have final say. The goal is to help users discover their character, not generate one automatically.

### Immediate Feedback

When a trait is accepted, it appears in the relevant form immediately. When a slider moves, the character's next response reflects that change.

### Consistency

The character's conversation responses stay consistent with the profile. A character marked as "blunt" should speak bluntly. An "evasive" character should dodge direct questions.

---

## What's Included in 1.0

### In Scope

- All personality form components wired and functional
- LLM-powered conversation (backend complete)
- Trait inference and acceptance flow
- Simplified body/appearance editing
- Save/load to database
- Form validation
- Loading states and error handling

### Out of Scope for 1.0

- Visual body map editor (future enhancement)
- Character portrait generation
- Relationship mapping between characters
- Export/import of character data
- Multi-language support
- Voice/audio preview

---

## Success Looks Like

A game master can:

1. Create a new character in under 10 minutes
2. Have a natural conversation that reveals personality
3. Accept AI suggestions that feel accurate
4. Save the character and use it in their game
5. Return later to edit and refine

The experience should feel like collaborative character development, not form-filling.

---

## Technical Foundation (Completed)

The backend work is done:

- LLM integration for character responses ✅
- Streaming for responsive conversations ✅
- Trait inference endpoint ✅
- Error handling for API failures ✅
- Multiple LLM provider support (OpenAI, Ollama, Anthropic) ✅

What remains is connecting the UI components to these capabilities.

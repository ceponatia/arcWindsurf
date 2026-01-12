# LLM-Facilitated Adult Roleplay with NPC Characters

**Created**: January 2026
**Purpose**: To define a framework for realistic and immersive text-based adult roleplay interactions with NPC characters in the ArcAgentic platform, incorporating sensory and hygiene guidelines with the World Bus architecture.

---

## 1. Introduction

This document expands on the concepts of the World Bus architecture and Synthesis Analysis to create a specialized framework for LLM-facilitated adult roleplay interactions with NPC characters. The goal is to enable realistic, preference-driven encounters that respect user boundaries while providing vivid, immersive narration. This framework integrates with the existing NPC agent system, prompt building mechanisms, and services like sensory and hygiene to ensure consistency and depth in interactions.

---

## 2. Core Objectives

- **Realistic Interactions**: Develop text-based encounters (including intimate ones) that feel authentic and responsive to user input.
- **User Preference Integration**: Adapt narratives based on user preferences and boundaries, ensuring comfort and consent.
- **Sensory and Hygiene Guidance**: Use sensory and hygiene data as guidelines for vivid narration without relying on explicitly stored adjectives.
- **World Bus Integration**: Leverage the event-driven World Bus architecture for continuous, autonomous NPC behavior during roleplay.

---

## 3. Existing System Analysis

### 3.1 NPC Agent Architecture

The current `NpcAgent` class (`@/home/brian/projects/arcWindsurf/arcAgentic/packages/agents/src/npc/npc-agent.ts:1-260`) handles dialogue and reactions with a per-turn lifecycle. It uses services like `SensoryService` and `HygieneService` to enrich context but lacks persistent state or autonomous behavior between turns.

### 3.2 Prompt Building System

Prompts are constructed using `buildDialogueSystemPrompt` and `buildEnhancedSystemPrompt` (`@/home/brian/projects/arcWindsurf/arcAgentic/packages/agents/src/npc/prompts.ts:1-216`), incorporating character traits, sensory context, and action sequences. This system supports detailed narrative generation but needs specific tailoring for adult content.

### 3.3 Sensory and Hygiene Services

The `SensoryServiceLike` and `HygieneServiceLike` interfaces (`@/home/brian/projects/arcWindsurf/arcAgentic/packages/agents/src/npc/types.ts:1-120`) provide contextual data (e.g., smell, touch) that can inform narration. These are underutilized for intimate scenarios and require guidelines for appropriate application.

### 3.4 World Bus Architecture

The World Bus (`@/home/brian/projects/arcWindsurf/arcAgentic/dev-docs/world-bus-vs-governor.md:1-947`) offers an event-driven model where NPCs can react continuously via events like `npc.spoke` or `time.advanced`. This is ideal for creating a 'living world' feel during roleplay, allowing NPCs to initiate or respond without player prompts.

---

## 4. Proposed Framework for Adult Roleplay

### 4.1 New Service: IntimacyService

- **Preference Mapping**: Store user preferences (e.g., comfort levels, specific interests like foot focus) as metadata, ensuring narratives align with user desires.
- **Narration Guidelines**: Use sensory and hygiene data as inspiration for vivid descriptions without direct adjective usage. For example, a high hygiene level might inspire phrases like 'a refreshing scent lingers close' rather than using stored terms.
- **Boundary Enforcement**: Implement strict checks to halt narratives if user input suggests discomfort or boundary crossing.

### 4.2 Enhanced Prompt Engineering

- **Dynamic Tone Adjustment**: Add parameters in `NpcResponseConfig` for tone (e.g., sensual, playful) based on the interaction type.
- **Contextual Depth**: Include user preference data and intimacy context in system prompts to guide LLM output. For instance, if a user focuses on an NPC's feet, the prompt might emphasize sensory details related to touch and scent in that area.
- **Consent Checks**: Embed explicit instructions in prompts to respect user boundaries, stopping or redirecting the narrative if consent is unclear.

### 4.3 World Bus Event Extensions

- **New Event Types**: Introduce events like `npc.intimacy.initiated`, `player.intimacy.response`, and `npc.intimacy.reaction` to handle the flow of intimate interactions.
- **Continuous Engagement**: Allow NPCs to publish `npc.intent` events for intimate actions based on utility scores (e.g., affinity, player focus), ensuring they can initiate or react autonomously.
- **Scheduler Adjustments**: Modify the actor scheduler to prioritize intimacy events when player focus is detected, preventing interruptions from unrelated NPC actions.

### 4.4 NPC Actor Enhancements

- **State Persistence**: Maintain an intimacy state (e.g., comfort level, progression) between turns to ensure narrative continuity.
- **Utility-Driven Actions**: Add intimacy as a utility score (alongside hunger, boredom) to drive NPC behavior in adult contexts, balanced with player focus and consent.
- **Event Reactions**: Enable NPCs to react to `player.intimacy.response` events with appropriate narrative depth, using `IntimacyService` guidelines.

---

## 5. Guidelines for Realistic Narration

To ensure vivid, realistic text-based encounters, the following guidelines should be applied by the `IntimacyService` and integrated into prompt engineering:

- **Sensory-Inspired Narration**: Use sensory data (e.g., touch, smell) as a foundation for description. For example, if hygiene data indicates a low cleanliness level for feet, the narration might suggest 'a faint earthy musk' without explicit reference to stored values.
- **User Focus Adaptation**: Dynamically adjust narrative focus based on user input. If the player emphasizes kissing an NPC's feet, the system should prioritize related sensory details (touch, texture) over unrelated aspects.
- **Emotional Context**: Reflect NPC mood and affinity in narration. High affinity might result in warmer, more inviting descriptions, while low affinity could introduce hesitation or playful resistance.
- **Progressive Disclosure**: Structure intimate encounters as a progression (e.g., flirtation, initiation, escalation), with clear checkpoints for user consent at each stage.
- **Avoid Overloading**: Limit sensory details to 1-2 per action to avoid overwhelming the user, ensuring focus remains on the interaction's emotional tone.

---

## 6. Implementation Plan

### Phase 1: Service Development (Weeks 1-2)

- Develop `IntimacyService` with preference mapping and narration guidelines.
- Define new event types for World Bus integration.

### Phase 2: Prompt and Configuration Updates (Weeks 3-4)

- Extend `NpcResponseConfig` with tone and intimacy parameters.
- Update prompt building functions to include intimacy context and consent checks.

### Phase 3: NPC Actor and Scheduler Enhancements (Weeks 5-6)

- Implement persistent intimacy state in `NpcActor`.
- Adjust scheduler to prioritize intimacy events during relevant player interactions.

### Phase 4: Testing and Iteration (Weeks 7-8)

- Conduct user testing to ensure comfort, realism, and adherence to boundaries.
- Iterate on narration guidelines based on feedback.

---

## 7. Risk Mitigation

- **User Comfort**: Implement strict boundary checks and opt-in mechanisms for adult content.
- **Content Appropriateness**: Use content filters in LLM prompts to avoid explicit or inappropriate output beyond user preferences.
- **Performance Impact**: Monitor LLM call volume during continuous roleplay interactions, using tiered model routing to manage costs.

---

## 8. Conclusion

This framework builds on the World Bus architecture and existing NPC systems to create a robust, user-centric approach to LLM-facilitated adult roleplay. By introducing an `IntimacyService`, enhancing prompts, and leveraging event-driven design, ArcAgentic can offer deeply immersive and personalized interactions while maintaining user comfort and consent. The phased implementation ensures compatibility with current systems while progressively introducing new capabilities.

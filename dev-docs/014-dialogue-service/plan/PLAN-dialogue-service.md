# Dialogue Service Plan

**Created**: January 30, 2026
**Status**: Complete
**Priority**: P2 - Design decision needed first
**Effort**: 20-40 hours (depending on approach)

---

## Overview

Implement the DialogueService to replace the placeholder that currently returns `"I'm listening..."` for all NPCs. This requires a design decision on the approach: dialogue trees, LLM-driven, or hybrid.

## Problem Statement

The current DialogueService in `packages/services/src/social/dialogue.ts` returns the same placeholder response for all NPCs regardless of context, topic, or relationship. This breaks immersion and prevents meaningful NPC interactions.

## Design Options

### Option A: Dialogue Trees (Data-Driven)

**Pros:**

- Predictable, testable responses
- Designers can craft specific story moments
- No LLM costs for scripted content
- Faster response times

**Cons:**

- Limited flexibility
- High authoring burden
- Can feel repetitive

**Implementation:**

- Define dialogue node schema
- Create DB tables for trees and state
- Build resolution engine
- UI for authoring dialogue trees

### Option B: LLM-Driven (Dynamic)

**Pros:**

- Infinite variety
- Adapts to any player input
- Low authoring burden
- Uses existing CognitionLayer

**Cons:**

- Unpredictable responses
- LLM costs per interaction
- Harder to enforce plot consistency
- Risk of breaking character

**Implementation:**

- Extend CognitionLayer with dialogue-specific prompts
- Store conversation history for consistency
- Add guardrails/rails for key topics

### Option C: Hybrid (Recommended)

**Pros:**

- Best of both worlds
- Key moments are controlled
- Casual conversation is flexible
- Cost-effective

**Cons:**

- More complex implementation
- Need to define which conversations use which system

**Implementation:**

- Dialogue trees for: quest triggers, important lore, reputation gates
- LLM for: casual greetings, general questions, filler conversation
- Seamless handoff between systems

## Recommended Approach

Start with **Option B (LLM-Driven)** as a quick win since CognitionLayer already exists, then layer in dialogue trees for key moments in a future phase.

### Phase 1: LLM-Driven Base (8-12 hours) - ✅ Complete

- Use CognitionLayer with dialogue-specific prompts
- Track conversation history per NPC/player pair
- Add personality-aware response generation

### Phase 2: Dialogue Trees for Key Moments (12-20 hours) - ✅ Complete

- Define schema for dialogue nodes
- Create authoring tool or integrate with existing builders
- Build resolution engine with condition evaluation
- Wire specific NPCs/topics to trees

## Success Criteria

- [x] NPCs respond contextually to player input
- [x] Personality traits influence response style
- [x] Conversation history affects future responses
- [x] Key plot moments can be scripted (Phase 2 - TASK-002)
- [x] Response time < 3 seconds

## Dependencies

- `@minimal-rpg/actors` - CognitionLayer (for LLM approach)
- `@minimal-rpg/schemas` - CharacterProfile with personality data
- `@minimal-rpg/db` - Conversation history storage

## Related Files

- [packages/services/src/social/dialogue.ts](../../packages/services/src/social/dialogue.ts) - LLM dialogue service
- [packages/services/src/social/dialogue-tree-resolver.ts](../../packages/services/src/social/dialogue-tree-resolver.ts) - Dialogue tree resolution
- [packages/schemas/src/dialogue/schemas.ts](../../packages/schemas/src/dialogue/schemas.ts) - Dialogue tree schemas
- [packages/db/sql/008_dialogue/008_dialogue.sql](../../packages/db/sql/008_dialogue/008_dialogue.sql) - DB tables

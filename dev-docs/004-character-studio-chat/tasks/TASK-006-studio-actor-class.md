# TASK-006: Studio Actor Class

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 45 minutes
**Depends On**: TASK-002, TASK-003, TASK-004, TASK-005

---

## Objective

Create the main StudioNpcActor class that wraps the XState machine and provides a clean API for the API layer to use.

## File to Create

`packages/actors/src/studio-npc/studio-actor.ts`

## Implementation

```typescript
// packages/actors/src/studio-npc/studio-actor.ts
import { createActor, type ActorRefFrom } from 'xstate';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';
import { createStudioMachine } from './studio-machine.js';
import { ConversationManager } from './conversation.js';
import type {
  StudioNpcActorConfig,
  ConversationMessage,
  InferredTrait,
  StudioResponse,
  DiscoveryTopic,
  StudioMachineContext,
  EmotionalRangeRequest,
  VignetteRequest,
  MemoryTopic,
  FirstImpressionContext,
} from './types.js';

/**
 * Main actor class for character studio conversations.
 * Provides a clean API over the XState machine.
 */
export class StudioNpcActor {
  private readonly machine: ActorRefFrom<ReturnType<typeof createStudioMachine>>;
  private readonly conversationManager: ConversationManager;
  private readonly config: StudioNpcActorConfig;

  constructor(config: StudioNpcActorConfig) {
    this.config = config;

    this.conversationManager = new ConversationManager({
      llmProvider: config.llmProvider,
      characterName: config.profile.name,
    });

    const initialContext: StudioMachineContext = {
      sessionId: config.sessionId,
      profile: config.profile,
      llmProvider: config.llmProvider,
      conversation: [],
      summary: null,
      inferredTraits: [],
      exploredTopics: new Set<DiscoveryTopic>(),
    };

    const machineDef = createStudioMachine(initialContext);
    this.machine = createActor(machineDef);
  }

  /**
   * Start the actor.
   */
  start(): void {
    this.machine.start();
  }

  /**
   * Stop the actor.
   */
  stop(): void {
    this.machine.stop();
  }

  /**
   * Send a message and get a response.
   */
  async respond(userMessage: string): Promise<StudioResponse> {
    // Add user message to conversation manager
    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.conversationManager.addMessage(userMsg);

    // Check if summarization is needed
    if (this.conversationManager.needsSummarization()) {
      await this.conversationManager.summarize();
    }

    // Send to machine and wait for response
    return new Promise((resolve, reject) => {
      const subscription = this.machine.subscribe((state) => {
        if (state.matches('idle') && state.context.pendingResponse) {
          subscription.unsubscribe();

          // Add character response to conversation manager
          const response = state.context.pendingResponse;
          const charMsg: ConversationMessage = {
            id: crypto.randomUUID(),
            role: 'character',
            content: response.response,
            thought: response.thought,
            timestamp: new Date(),
          };
          this.conversationManager.addMessage(charMsg);

          // Trigger callbacks
          if (this.config.onTraitInferred) {
            for (const trait of response.inferredTraits) {
              this.config.onTraitInferred(trait);
            }
          }

          resolve(response);
        }

        if (state.context.error) {
          subscription.unsubscribe();
          reject(new Error(state.context.error));
        }
      });

      this.machine.send({ type: 'SEND_MESSAGE', content: userMessage });
    });
  }

  /**
   * Update the character profile.
   */
  updateProfile(profile: Partial<CharacterProfile>): void {
    this.machine.send({ type: 'UPDATE_PROFILE', profile });

    if (this.config.onProfileUpdate) {
      this.config.onProfileUpdate(profile);
    }
  }

  /**
   * Clear the conversation and start fresh.
   */
  clearConversation(): void {
    this.conversationManager.clear();
    this.machine.send({ type: 'CLEAR_CONVERSATION' });
  }

  /**
   * Get the current conversation summary.
   */
  getConversationSummary(): string | null {
    return this.conversationManager.getSummary();
  }

  /**
   * Get all messages for display.
   */
  getAllMessages(): ConversationMessage[] {
    return this.conversationManager.getAllMessages();
  }

  /**
   * Get inferred traits from the current session.
   */
  getInferredTraits(): InferredTrait[] {
    const snapshot = this.machine.getSnapshot();
    return snapshot.context.inferredTraits;
  }

  /**
   * Get explored topics.
   */
  getExploredTopics(): DiscoveryTopic[] {
    const snapshot = this.machine.getSnapshot();
    return Array.from(snapshot.context.exploredTopics);
  }

  /**
   * Request a moral dilemma.
   */
  async requestDilemma(): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_DILEMMA');
  }

  /**
   * Request emotional range demonstration.
   */
  async requestEmotionalRange(request: EmotionalRangeRequest): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_EMOTIONAL_RANGE', { request });
  }

  /**
   * Request a relationship vignette.
   */
  async requestVignette(request: VignetteRequest): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_VIGNETTE', { request });
  }

  /**
   * Request memory excavation.
   */
  async requestMemory(topic: MemoryTopic): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_MEMORY', { topic });
  }

  /**
   * Request first impression analysis.
   */
  async requestFirstImpression(context?: FirstImpressionContext): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_FIRST_IMPRESSION', context);
  }

  /**
   * Request voice fingerprint analysis.
   */
  async requestVoiceFingerprint(): Promise<StudioResponse> {
    return this.requestAdvancedFeature('REQUEST_VOICE_FINGERPRINT');
  }

  /**
   * Export state for persistence.
   */
  exportState(): {
    conversation: ConversationMessage[];
    summary: string | null;
    inferredTraits: InferredTrait[];
    exploredTopics: DiscoveryTopic[];
  } {
    const snapshot = this.machine.getSnapshot();
    return {
      ...this.conversationManager.export(),
      inferredTraits: snapshot.context.inferredTraits,
      exploredTopics: Array.from(snapshot.context.exploredTopics),
    };
  }

  /**
   * Restore state from persistence.
   */
  restoreState(state: {
    conversation: ConversationMessage[];
    summary: string | null;
    inferredTraits: InferredTrait[];
    exploredTopics: DiscoveryTopic[];
  }): void {
    this.conversationManager.restore({
      messages: state.conversation,
      summary: state.summary,
    });

    // Update machine context (would need machine to support this)
    // For now, traits and topics are managed separately
  }

  /**
   * Get current machine state (for debugging).
   */
  getMachineState(): string {
    const snapshot = this.machine.getSnapshot();
    return String(snapshot.value);
  }

  private async requestAdvancedFeature(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<StudioResponse> {
    return new Promise((resolve, reject) => {
      const subscription = this.machine.subscribe((state) => {
        if (state.matches('idle') && state.context.pendingResponse) {
          subscription.unsubscribe();
          resolve(state.context.pendingResponse);
        }

        if (state.context.error) {
          subscription.unsubscribe();
          reject(new Error(state.context.error));
        }
      });

      this.machine.send({ type, ...payload } as any);
    });
  }
}

/**
 * Factory function for creating a StudioNpcActor.
 */
export function createStudioNpcActor(config: StudioNpcActorConfig): StudioNpcActor {
  const actor = new StudioNpcActor(config);
  actor.start();
  return actor;
}
```

## Export from index.ts

Update `packages/actors/src/studio-npc/index.ts`:

```typescript
export * from './types.js';
export { createStudioMachine } from './studio-machine.js';
export { ConversationManager } from './conversation.js';
export * from './prompts.js';
export { StudioNpcActor, createStudioNpcActor } from './studio-actor.js';
```

## Acceptance Criteria

- [x] `StudioNpcActor` class created
- [x] `start()` and `stop()` manage machine lifecycle
- [x] `respond()` sends message and returns StudioResponse
- [x] `updateProfile()` updates character profile
- [x] `clearConversation()` resets state
- [x] `getConversationSummary()` returns current summary
- [x] `getAllMessages()` returns full history
- [x] `getInferredTraits()` returns traits from session
- [x] Advanced feature methods (requestDilemma, etc.) stubbed
- [x] `exportState()` and `restoreState()` for persistence
- [x] `createStudioNpcActor()` factory function
- [x] All exports in index.ts

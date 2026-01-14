import { useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  conversationHistory,
  characterProfile,
  isGenerating,
  pendingTraits,
  studioSessionId,
  suggestedPrompts,
  exploredTopics,
  addMessage,
} from '../signals.js';
import { studioConversation, suggestPrompts, generateDilemma as generateDilemmaService } from '../services/llm.js';

export interface UseConversationResult {
  messages: typeof conversationHistory.value;
  isGenerating: boolean;
  suggestedPrompts: typeof suggestedPrompts.value;
  sendMessage: (content: string) => Promise<void>;
  generateDilemma: () => Promise<void>;
  clearConversation: () => void;
  loadSuggestedPrompts: () => Promise<void>;
}

export function useConversation(): UseConversationResult {
  useSignals();

  const handleStudioResponse = (response: any) => {
    // Add character response or dilemma
    addMessage({
      role: response.response.startsWith('[DILEMMA]') ? 'system' : 'character',
      content: response.response,
    });

    // Handle inferred traits
    if (response.inferredTraits.length > 0) {
      pendingTraits.value = [
        ...pendingTraits.value,
        ...response.inferredTraits.map((t: any) => ({
          ...t,
          status: 'pending' as const,
        })),
      ];
    }

    // Update suggested prompts
    suggestedPrompts.value = response.suggestedPrompts || [];

    // Update explored topics
    exploredTopics.value = response.meta.exploredTopics;
  };

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately for UI
    addMessage({ role: 'user', content });
    isGenerating.value = true;

    try {
      const profile = characterProfile.value;

      // Call new conversation API
      const response = await studioConversation({
        ...(studioSessionId.value ? { sessionId: studioSessionId.value } : {}),
        profile,
        message: content,
      });

      // Store session ID for future requests
      studioSessionId.value = response.sessionId;

      handleStudioResponse(response);

    } catch (err) {
      console.error('Conversation error:', err);
      addMessage({
        role: 'system',
        content: 'Failed to generate response. Please try again.',
      });
    } finally {
      isGenerating.value = false;
    }
  }, []);

  const generateDilemma = useCallback(async () => {
    if (!studioSessionId.value) return;
    isGenerating.value = true;

    try {
      const response = await generateDilemmaService({
        sessionId: studioSessionId.value,
        profile: characterProfile.value,
      });

      handleStudioResponse(response);
    } catch (err) {
      console.error('Dilemma generation error:', err);
      addMessage({
        role: 'system',
        content: 'Failed to generate dilemma. Please try again.',
      });
    } finally {
      isGenerating.value = false;
    }
  }, []);

  const clearConversation = useCallback(() => {
    conversationHistory.value = [];
    pendingTraits.value = [];
    suggestedPrompts.value = [];
    exploredTopics.value = [];
    // Keep session ID - backend will handle clearing
  }, []);

  const loadSuggestedPrompts = useCallback(async () => {
    try {
      const response = await suggestPrompts({
        profile: characterProfile.value,
        exploredTopics: exploredTopics.value,
      });
      suggestedPrompts.value = response.prompts;
    } catch (err) {
      console.error('Failed to load suggested prompts:', err);
    }
  }, []);

  return {
    messages: conversationHistory.value,
    isGenerating: isGenerating.value,
    suggestedPrompts: suggestedPrompts.value,
    sendMessage,
    generateDilemma,
    clearConversation,
    loadSuggestedPrompts,
  };
}

import { useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  conversationHistory,
  isGenerating,
  pendingTraits,
  characterProfile,
  addMessage,
} from '../signals.js';
import { generateCharacterResponse, inferTraitsFromMessage } from '../services/llm.js';

export interface UseConversationResult {
  messages: typeof conversationHistory.value;
  isGenerating: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
}

export function useConversation(): UseConversationResult {
  useSignals();

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content });

    isGenerating.value = true;

    try {
      // Generate character response
      const profile = characterProfile.value;
      const history = conversationHistory.value;

      const response = await generateCharacterResponse({
        profile,
        history,
        userMessage: content,
      });

      // Add character response
      addMessage({ role: 'character', content: response.content });

      // Infer traits from the exchange
      const inferred = await inferTraitsFromMessage({
        userMessage: content,
        characterResponse: response.content,
        currentProfile: profile,
      });

      if (inferred.length > 0) {
        pendingTraits.value = [
          ...pendingTraits.value,
          ...inferred.map(t => ({ ...t, status: 'pending' as const })),
        ];
      }
    } catch (err) {
      console.error('Conversation error:', err);
      addMessage({
        role: 'system',
        content: 'Failed to generate response. Please try again.',
      });
      throw err;
    } finally {
      isGenerating.value = false;
    }
  }, []);

  const clearConversation = useCallback(() => {
    conversationHistory.value = [];
    pendingTraits.value = [];
  }, []);

  return {
    messages: conversationHistory.value,
    isGenerating: isGenerating.value,
    sendMessage,
    clearConversation,
  };
}

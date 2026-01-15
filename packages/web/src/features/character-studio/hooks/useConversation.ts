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
  traitInferenceEnabled,
  conversationSummary,
  addMessage,
} from '../signals.js';
import { studioConversationStream, inferTraits, suggestPrompts, generateDilemmaScenario, summarizeConversation } from '../services/llm.js';

export interface UseConversationResult {
  messages: typeof conversationHistory.value;
  isGenerating: boolean;
  suggestedPrompts: typeof suggestedPrompts.value;
  sendMessage: (content: string) => Promise<void>;
  generateDilemma: () => Promise<void>;
  summarize: () => Promise<boolean>;
  clearConversation: () => void;
  loadSuggestedPrompts: () => Promise<void>;
}

export function useConversation(): UseConversationResult {
  useSignals();

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately for UI
    addMessage({ role: 'user', content });
    isGenerating.value = true;

    // Add placeholder message for streaming response
    addMessage({ role: 'character', content: '' });

    try {
      const profile = characterProfile.value;

      // Call streaming conversation API
      await studioConversationStream(
        {
          ...(studioSessionId.value ? { sessionId: studioSessionId.value } : {}),
          profile,
          message: content,
        },
        {
          onSessionId: (sessionId) => {
            studioSessionId.value = sessionId;
          },
          onContent: (chunk) => {
            // Update the last message (streaming placeholder) with new content
            const messages = conversationHistory.value;
            const lastMsg = messages[messages.length - 1];
            if (lastMsg?.role === 'character') {
              conversationHistory.value = [
                ...messages.slice(0, -1),
                { ...lastMsg, content: lastMsg.content + chunk },
              ];
            }
          },
          onDone: (response) => {
            // Update explored topics and suggested prompts from final response
            if (response.meta?.exploredTopics) {
              exploredTopics.value = response.meta.exploredTopics;
            }

            const currentHistory = conversationHistory.value;
            const lastResponse = currentHistory[currentHistory.length - 1]?.content ?? '';

            if (response.inferredTraits && response.inferredTraits.length > 0) {
              pendingTraits.value = [
                ...pendingTraits.value,
                ...response.inferredTraits.map((t, index) => ({
                  ...t,
                  id: `trait-${Date.now()}-${index}`,
                  status: 'pending' as const,
                })),
              ];
            }

            // Fire async trait inference (non-blocking)
            if (traitInferenceEnabled.value && studioSessionId.value) {
              inferTraits({
                sessionId: studioSessionId.value,
                userMessage: content,
                characterResponse: lastResponse,
                profile,
              }).then((result) => {
                if (result.inferredTraits && result.inferredTraits.length > 0) {
                  pendingTraits.value = [
                    ...pendingTraits.value,
                    ...result.inferredTraits.map((t, i) => ({
                      ...t,
                      id: `trait-async-${Date.now()}-${i}`,
                      status: 'pending' as const,
                    })),
                  ];
                }
              }).catch(err => {
                console.error('Async trait inference failed:', err);
              });
            }

            // Fire async summarization (non-blocking) if threshold reached and no summary exists
            const messageCount = response.meta?.messageCount ?? currentHistory.length;
            if (messageCount >= 20 && !conversationSummary.value && studioSessionId.value) {
              summarizeConversation(studioSessionId.value)
                .then(result => {
                  if (result.summarized) {
                    console.log('Conversation summarized', result.summary);
                    conversationSummary.value = result.summary;
                  }
                })
                .catch(err => {
                  console.error('Async summarization failed:', err);
                });
            }
          },
          onError: (error) => {
            console.error('Stream error:', error);
            // Replace streaming message with error using addMessage after removing placeholder
            conversationHistory.value = conversationHistory.value.slice(0, -1);
            addMessage({ role: 'system', content: 'Failed to generate response. Please try again.' });
          },
        }
      );

    } catch (err) {
      console.error('Conversation error:', err);
      // Replace streaming message with error using addMessage after removing placeholder
      conversationHistory.value = conversationHistory.value.slice(0, -1);
      addMessage({ role: 'system', content: 'Failed to generate response. Please try again.' });
    } finally {
      isGenerating.value = false;
    }
  }, []);

  const summarize = useCallback(async () => {
    if (!studioSessionId.value) return false;

    try {
      const result = await summarizeConversation(studioSessionId.value);
      if (result.summarized && result.summary) {
        conversationSummary.value = result.summary;
      }
      return result.summarized;
    } catch (err) {
      console.error('Manual summarization failed:', err);
      throw err;
    }
  }, []);

  const generateDilemma = useCallback(async () => {
    isGenerating.value = true;

    try {
      // Step 1: Generate the dilemma scenario
      const dilemmaResponse = await generateDilemmaScenario({
        profile: characterProfile.value,
      });

      if (!dilemmaResponse.scenario) {
        throw new Error('No dilemma scenario generated');
      }

      // Step 2: Format the dilemma as a user message and send through regular streaming
      const dilemmaPrompt = `⚖️ **Moral Dilemma**\n\n${dilemmaResponse.scenario}\n\nHow do you respond to this situation?`;

      // This will show the dilemma as a "user" message and get streaming response
      await sendMessage(dilemmaPrompt);
    } catch (err) {
      console.error('Dilemma generation error:', err);
      addMessage({
        role: 'system',
        content: 'Failed to generate dilemma. Please try again.',
      });
      isGenerating.value = false;
    }
  }, [sendMessage]);

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
    summarize,
    clearConversation,
    loadSuggestedPrompts,
  };
}

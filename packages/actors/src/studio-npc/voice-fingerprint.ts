import type { ConversationMessage, VoiceFingerprint } from './types.js';

/**
 * Analyzes conversation history to extract a character's "voice fingerprint" (patterns, vocabulary, rhythm).
 */
export class VoiceFingerprintAnalyzer {
  /**
   * Analyze messages to determine the voice fingerprint.
   */
  analyze(messages: ConversationMessage[]): VoiceFingerprint {
    const characterMessages = messages
      .filter(m => m.role === 'character')
      .map(m => m.content);

    if (characterMessages.length < 5) {
      return this.getDefaultFingerprint();
    }

    return {
      vocabulary: this.analyzeVocabulary(characterMessages),
      rhythm: this.analyzeRhythm(characterMessages),
      patterns: this.analyzePatterns(characterMessages),
      humor: this.analyzeHumor(characterMessages),
    };
  }

  private analyzeVocabulary(messages: string[]): VoiceFingerprint['vocabulary'] {
    const allWords = messages.join(' ').toLowerCase().split(/\s+/);
    const avgWordLength = allWords.length > 0
      ? allWords.reduce((sum, w) => sum + w.length, 0) / allWords.length
      : 0;

    let level: VoiceFingerprint['vocabulary']['level'] = 'average';
    if (avgWordLength > 6) level = 'educated';
    if (avgWordLength > 7) level = 'erudite';
    if (avgWordLength < 4.5) level = 'simple';

    // Find distinctive words (appear in >30% of messages)
    const wordCounts = new Map<string, number>();
    for (const msg of messages) {
      const words = new Set(msg.toLowerCase().split(/\s+/));
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    const threshold = messages.length * 0.3;
    const distinctiveWords = Array.from(wordCounts.entries())
      .filter(([word, count]) => count >= threshold && word.length > 4)
      .map(([word]) => word)
      .slice(0, 5);

    return { level, distinctiveWords };
  }

  private analyzeRhythm(messages: string[]): VoiceFingerprint['rhythm'] {
    const sentenceLengths = messages.flatMap(m =>
      m.split(/[.!?]+/).filter(s => s.trim()).map(s => s.split(/\s+/).length)
    );

    if (sentenceLengths.length === 0) {
      return { averageSentenceLength: 10, variability: 'varied' };
    }

    const avg = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.abs(len - avg), 0) / sentenceLengths.length;

    let variability: VoiceFingerprint['rhythm']['variability'] = 'varied';
    if (variance < 3) variability = 'consistent';
    if (variance > 8) variability = 'erratic';

    return { averageSentenceLength: Math.round(avg), variability };
  }

  private analyzePatterns(messages: string[]): VoiceFingerprint['patterns'] {
    // Find repeated phrases (2-3 words)
    const phrases = new Map<string, number>();
    for (const msg of messages) {
      const words = msg.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words.slice(i, i + 3).join(' ');
        phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
      }
    }

    const signaturePhrases = Array.from(phrases.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase]) => phrase);

    return { signaturePhrases, avoidedTopics: [], emotionalTriggers: [] };
  }

  private analyzeHumor(messages: string[]): VoiceFingerprint['humor'] {
    const humorIndicators = ['haha', 'heh', 'joke', 'kidding', 'funny', 'laugh', ':)', ';)'];
    const text = messages.join(' ').toLowerCase();

    const humorCount = humorIndicators.reduce((count, indicator) =>
      count + (text.split(indicator).length - 1), 0
    );

    const frequency = humorCount === 0 ? 'none' :
      humorCount < 2 ? 'rare' :
        humorCount < 5 ? 'occasional' : 'frequent';

    return { frequency, type: null };
  }

  private getDefaultFingerprint(): VoiceFingerprint {
    return {
      vocabulary: { level: 'average', distinctiveWords: [] },
      rhythm: { averageSentenceLength: 10, variability: 'varied' },
      patterns: { signaturePhrases: [], avoidedTopics: [], emotionalTriggers: [] },
      humor: { frequency: 'none', type: null },
    };
  }
}

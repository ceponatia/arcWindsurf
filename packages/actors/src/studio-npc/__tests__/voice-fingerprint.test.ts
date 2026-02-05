import { describe, it, expect } from 'vitest';
import { VoiceFingerprintAnalyzer } from '../voice-fingerprint.js';
import type { ConversationMessage } from '../types.js';

describe('studio-npc/voice-fingerprint', () => {
  it('returns defaults when there are fewer than five character messages', () => {
    const analyzer = new VoiceFingerprintAnalyzer();
    const messages: ConversationMessage[] = [
      { id: '1', role: 'character', content: 'Hello.', timestamp: new Date() },
      { id: '2', role: 'character', content: 'Hi.', timestamp: new Date() },
      { id: '3', role: 'character', content: 'Hey.', timestamp: new Date() },
      { id: '4', role: 'user', content: 'Question?', timestamp: new Date() },
    ];

    const fingerprint = analyzer.analyze(messages);

    expect(fingerprint.vocabulary.level).toBe('average');
    expect(fingerprint.rhythm.variability).toBe('varied');
    expect(fingerprint.humor.frequency).toBe('none');
  });

  it('infers vocabulary, patterns, and humor from repeated phrasing', () => {
    const analyzer = new VoiceFingerprintAnalyzer();
    const messages: ConversationMessage[] = [
      { id: '1', role: 'character', content: 'Extraordinary circumstances demand extraordinary measures. Haha.', timestamp: new Date() },
      { id: '2', role: 'character', content: 'Extraordinary circumstances demand extraordinary measures.', timestamp: new Date() },
      { id: '3', role: 'character', content: 'Extraordinary circumstances demand extraordinary measures.', timestamp: new Date() },
      { id: '4', role: 'character', content: 'Extraordinary circumstances demand extraordinary measures.', timestamp: new Date() },
      { id: '5', role: 'character', content: 'Extraordinary circumstances demand extraordinary measures. Haha.', timestamp: new Date() },
    ];

    const fingerprint = analyzer.analyze(messages);

    expect(fingerprint.vocabulary.level).toBe('erudite');
    expect(fingerprint.patterns.signaturePhrases.length).toBeGreaterThan(0);
    expect(fingerprint.humor.frequency).toBe('occasional');
  });
});

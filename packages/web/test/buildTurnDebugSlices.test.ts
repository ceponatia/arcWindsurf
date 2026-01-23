import { describe, it, expect } from 'vitest';
import { buildTurnDebugSlices } from '../src/features/chat/buildTurnDebugSlices.js';


describe('buildTurnDebugSlices', () => {
  it('builds slices from metadata', () => {
    const slices = buildTurnDebugSlices({
      intent: {
        type: 'MOVE',
        confidence: 0.9,
        params: { direction: 'north' },
        signals: ['signal'],
      },
      intentDebug: {
        detector: 'detector',
        model: 'model',
        prompt: { system: 'sys', user: 'user' },
        rawResponse: { ok: true },
        parsed: { parsed: true },
        warnings: ['warn'],
      },
      phaseTiming: { intentDetectionMs: 12 },
      agentsInvoked: ['narrator'],
      agentOutputs: [
        {
          agentType: 'narrator',
          output: { narrative: 'Story', diagnostics: { executionTimeMs: 10 } },
        },
      ],
    });

    expect(slices.length).toBeGreaterThan(2);
    expect(slices[0]?.title).toBe('Intent Detection');
  });
});

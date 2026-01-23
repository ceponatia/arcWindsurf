import { describe, it, expect, vi } from 'vitest';
import { AttributeParser } from '../src/parsers/attribute-parser/attribute-parser.js';


describe('AttributeParser', () => {
  it('extracts attributes with patterns', async () => {
    const parser = new AttributeParser();
    const result = await parser.parse('She has brown hair');
    expect(result[0]?.path).toBe('physique.appearance.hair.color');
  });

  it('falls back to LLM provider', async () => {
    const llmProvider = {
      generate: vi.fn(async () => ({
        text: '[{"path":"physique.build.height","value":"170cm"}]',
      })),
    };
    const parser = new AttributeParser({ llmProvider });
    const result = await parser.parse('No patterns here');
    expect(result[0]?.path).toBe('physique.build.height');
  });

  it('handles invalid LLM response', async () => {
    const llmProvider = {
      generate: vi.fn(async () => ({ text: 'no json' })),
    };
    const parser = new AttributeParser({ llmProvider });
    const result = await parser.parse('No patterns here');
    expect(result).toHaveLength(0);
  });
});

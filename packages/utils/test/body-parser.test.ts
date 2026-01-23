import { describe, it, expect } from 'vitest';
import {
  parseScent,
  parseTexture,
  parseVisual,
  parseFlavor,
  parseBodyEntry,
  parseBodyEntries,
  formatBodyMap,
} from '../src/parsers/body-parser/index.js';

const bodyInput = `hair: scent: strong musk, floral\nhand: texture: warm, damp`;

describe('body parser', () => {
  it('parses sensory descriptions', () => {
    const scent = parseScent('strong musk, floral');
    expect(scent?.primary).toBe('musk');
    expect(scent?.notes).toContain('floral');

    const texture = parseTexture('warm, damp, calloused');
    expect(texture?.temperature).toBe('warm');
    expect(texture?.moisture).toBe('damp');

    const visual = parseVisual('long hair, braided');
    expect(visual?.features).toContain('braided');

    const flavor = parseFlavor('subtle salty, metallic');
    expect(flavor?.primary).toBe('salty');
  });

  it('parses body entries and formats map', () => {
    const entry = parseBodyEntry('hair: scent: musk');
    expect(entry?.region).toBe('hair');

    const result = parseBodyEntries(bodyInput);
    expect(result.warnings).toHaveLength(0);

    const formatted = formatBodyMap(result.bodyMap);
    expect(formatted).toContain('hair: scent');
  });
});

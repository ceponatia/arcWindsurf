import { describe, it, expect } from 'vitest';
import { parsePlayerInput } from '../src/parsers/input-parser.js';

describe('parsePlayerInput', () => {
  it('parses speech, thought, and action segments', () => {
    const result = parsePlayerInput('Hello ~thinking~ *waves*');
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]?.type).toBe('speech');
    expect(result.segments[1]?.type).toBe('thought');
    expect(result.segments[2]?.type).toBe('action');
  });
});

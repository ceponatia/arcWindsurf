import { describe, it, expect } from 'vitest';
import {
  containsSensoryKeyword,
  detectSensoryType,
  extractIntensity,
  extractTemperature,
  extractMoisture,
  getIntensityWord,
  getIntensityKeywordsInRange,
} from '../src/parsers/body-parser/keywords.js';


describe('body keywords', () => {
  it('detects sensory keywords and types', () => {
    expect(containsSensoryKeyword('smelling', ['smell'])).toBe(true);
    expect(detectSensoryType('I smell something')).toBe('scent');
  });

  it('extracts intensity and modifiers', () => {
    const { intensity, cleaned } = extractIntensity('strong lavender');
    expect(intensity).toBeGreaterThan(0.7);
    expect(cleaned).toBe('lavender');

    expect(getIntensityWord(0.9)).toBe('overwhelming');
    const keywords = getIntensityKeywordsInRange(0.7, 0.9);
    expect(keywords.length).toBeGreaterThan(0);
  });

  it('extracts temperature and moisture', () => {
    const temp = extractTemperature('warm and cozy');
    expect(temp.temperature).toBe('warm');

    const moist = extractMoisture('slightly damp surface');
    expect(moist.moisture).toBe('damp');
  });
});

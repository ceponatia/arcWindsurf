import { describe, expect, it } from 'vitest';
import {
  resolveSensoryProfile,
  type SensoryProfileConfig,
  type ResolvedBodyMap,
} from '../src/body-regions/resolveSensoryProfile.js';

describe('resolveSensoryProfile', () => {
  it('returns auto-defaults when config is empty', () => {
    const resolved = resolveSensoryProfile({}, undefined);
    const hair = (resolved as ResolvedBodyMap).hair;

    expect(resolved._meta?.sources.length).toBeGreaterThan(0);
    expect(hair?.scent?.primary).toBeDefined();
    expect(hair?.scent?._attribution?.length ?? 0).toBeGreaterThan(0);
  });

  it('applies a single template and tracks attribution', () => {
    const config: SensoryProfileConfig = {
      autoDefaults: { enabled: false },
      templateBlend: {
        templates: [{ templateId: 'woodland-spirit', weight: 1 }],
        blendMode: 'weighted',
      },
    };

    const resolved = resolveSensoryProfile({}, config);
    const hair = resolved.hair;

    expect(hair?.scent?.primary).toBe('wildflowers');
    expect(hair?.scent?._attribution ?? []).toContain('template:woodland-spirit');
  });

  it('manual overrides always win', () => {
    const config: SensoryProfileConfig = {
      autoDefaults: { enabled: false },
      templateBlend: {
        templates: [{ templateId: 'woodland-spirit', weight: 1 }],
        blendMode: 'weighted',
      },
    };

    const resolved = resolveSensoryProfile(
      {
        body: {
          hair: {
            scent: { primary: 'custom', intensity: 0.5 },
          },
        },
      },
      config
    );

    expect(resolved.hair?.scent?.primary).toBe('custom');
    expect(resolved.hair?.scent?._attribution ?? []).toContain('override');
  });

  it('skips templates with zero weight', () => {
    const config: SensoryProfileConfig = {
      autoDefaults: { enabled: true },
      templateBlend: {
        templates: [{ templateId: 'woodland-spirit', weight: 0 }],
        blendMode: 'weighted',
      },
    };

    const resolved = resolveSensoryProfile({}, config);
    expect(resolved.hair?.scent?._attribution ?? []).not.toContain('template:woodland-spirit');
  });

  it('tracks attribution across multiple templates', () => {
    const config: SensoryProfileConfig = {
      autoDefaults: { enabled: false },
      templateBlend: {
        templates: [
          { templateId: 'woodland-spirit', weight: 0.6 },
          { templateId: 'noble-refined', weight: 0.4 },
        ],
        blendMode: 'weighted',
      },
    };

    const resolved = resolveSensoryProfile({}, config);
    const attribution = resolved.hair?.scent?._attribution ?? [];

    expect(attribution).toContain('template:woodland-spirit');
    expect(attribution).toContain('template:noble-refined');
  });
});

import { describe, expect, test } from 'vitest';
import {
  ALL_DEFAULT_SCENTS,
  GROUPED_DEFAULT_SCENTS,
} from '../src/body-regions/hygiene-data.js';
import { FEET_DEFAULT_SCENTS } from '../src/body-regions/feet/hygiene-data.js';
import { TOE_REGIONS } from '../src/body-regions/feet/toes.js';
import { flattenHygieneData } from '../src/state/hygiene-types.js';

describe('body-regions hygiene data', () => {
  test('groups granular toe regions under feet defaults', () => {
    const toes = GROUPED_DEFAULT_SCENTS.feet.feet.toes;

    for (const toe of TOE_REGIONS) {
      expect(toes[toe]).toBeDefined();
      expect(ALL_DEFAULT_SCENTS[toe]).toEqual(FEET_DEFAULT_SCENTS[toe]);
    }
  });

  test('flattenHygieneData applies group overrides safely', () => {
    const defaultProfile = {
      0: { scent: { primary: 'fresh', intensity: 0.1 } },
    };

    const groupProfile = {
      0: { scent: { primary: 'distinct', intensity: 0.4 } },
    };

    const flattened = flattenHygieneData(
      {
        default: defaultProfile,
        groups: {
          override: { regions: ['feet'], profile: groupProfile },
          ignored: { regions: ['ghost'], profile: groupProfile },
        },
      },
      ['head', 'feet']
    );

    expect(flattened.head).toEqual(defaultProfile);
    expect(flattened.feet).toEqual(groupProfile);
    expect(flattened.ghost).toBeUndefined();
  });
});

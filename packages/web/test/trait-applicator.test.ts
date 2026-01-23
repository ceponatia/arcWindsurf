import { describe, it, expect, vi } from 'vitest';
import { ATTACHMENT_STYLES } from '@minimal-rpg/schemas';

const characterProfile = {
  value: {
    personalityMap: {},
  },
};
const updatePersonalityMap = vi.fn((patch: Record<string, unknown>) => {
  characterProfile.value.personalityMap = {
    ...characterProfile.value.personalityMap,
    ...patch,
  };
});
const updateProfile = vi.fn();

vi.mock('../src/features/character-studio/signals.js', () => ({
  characterProfile,
  updatePersonalityMap,
  updateProfile,
}));

describe('applyTrait', () => {
  it('updates profile and personality map', async () => {
    const { applyTrait } = await import(
      '../src/features/character-studio/utils/trait-applicator.js'
    );

    applyTrait({ path: 'name', value: 'Ava' });
    expect(updateProfile).toHaveBeenCalledWith('name', 'Ava');

    const attachment = ATTACHMENT_STYLES[0];
    if (!attachment) throw new Error('Missing attachment style');

    applyTrait({ path: 'personalityMap.attachment', value: attachment });
    expect(updatePersonalityMap).toHaveBeenCalled();
  });
});

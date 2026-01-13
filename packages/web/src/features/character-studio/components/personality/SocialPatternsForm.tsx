import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  STRANGER_DEFAULTS,
  WARMTH_RATES,
  SOCIAL_ROLES,
  CONFLICT_STYLES,
  CRITICISM_RESPONSES,
  BOUNDARY_TYPES,
} from '@minimal-rpg/schemas';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput } from '../../../../shared/components/common.js';

export const SocialPatternsForm: React.FC = () => {
  useSignals();

  const social = characterProfile.value.personalityMap?.social ?? {
    strangerDefault: STRANGER_DEFAULTS[1],
    warmthRate: WARMTH_RATES[1],
    preferredRole: SOCIAL_ROLES[1],
    conflictStyle: CONFLICT_STYLES[1],
    criticismResponse: CRITICISM_RESPONSES[1],
    boundaries: BOUNDARY_TYPES[1],
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      social: {
        ...social,
        [field]: value,
      },
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectInput
        label="Stranger Default"
        value={social.strangerDefault}
        onChange={(v) => handleChange('strangerDefault', v)}
        options={STRANGER_DEFAULTS}
      />
      <SelectInput
        label="Warmth Rate"
        value={social.warmthRate}
        onChange={(v) => handleChange('warmthRate', v)}
        options={WARMTH_RATES}
      />
      <SelectInput
        label="Preferred Role"
        value={social.preferredRole}
        onChange={(v) => handleChange('preferredRole', v)}
        options={SOCIAL_ROLES}
      />
      <SelectInput
        label="Conflict Style"
        value={social.conflictStyle}
        onChange={(v) => handleChange('conflictStyle', v)}
        options={CONFLICT_STYLES}
      />
      <SelectInput
        label="Criticism Response"
        value={social.criticismResponse}
        onChange={(v) => handleChange('criticismResponse', v)}
        options={CRITICISM_RESPONSES}
      />
      <SelectInput
        label="Boundaries"
        value={social.boundaries}
        onChange={(v) => handleChange('boundaries', v)}
        options={BOUNDARY_TYPES}
      />
    </div>
  );
};

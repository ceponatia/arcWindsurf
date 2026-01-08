import React from 'react';
import {
  STRANGER_DEFAULTS,
  WARMTH_RATES,
  SOCIAL_ROLES,
  CONFLICT_STYLES,
  CRITICISM_RESPONSES,
  BOUNDARY_TYPES,
} from '@minimal-rpg/schemas';
import type { PersonalityFormState } from '@minimal-rpg/schemas';
import { Subsection, SelectInput } from '../../../../shared/components/common.js';

interface SocialPatternsFormProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const SocialPatternsForm: React.FC<SocialPatternsFormProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Social Patterns">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Stranger Default"
          value={pm.social.strangerDefault}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              strangerDefault: v as (typeof STRANGER_DEFAULTS)[number],
            })
          }
          options={STRANGER_DEFAULTS}
        />
        <SelectInput
          label="Warmth Rate"
          value={pm.social.warmthRate}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              warmthRate: v as (typeof WARMTH_RATES)[number],
            })
          }
          options={WARMTH_RATES}
        />
        <SelectInput
          label="Preferred Role"
          value={pm.social.preferredRole}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              preferredRole: v as (typeof SOCIAL_ROLES)[number],
            })
          }
          options={SOCIAL_ROLES}
        />
        <SelectInput
          label="Conflict Style"
          value={pm.social.conflictStyle}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              conflictStyle: v as (typeof CONFLICT_STYLES)[number],
            })
          }
          options={CONFLICT_STYLES}
        />
        <SelectInput
          label="Criticism Response"
          value={pm.social.criticismResponse}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              criticismResponse: v as (typeof CRITICISM_RESPONSES)[number],
            })
          }
          options={CRITICISM_RESPONSES}
        />
        <SelectInput
          label="Boundaries"
          value={pm.social.boundaries}
          onChange={(v) =>
            updatePM('social', {
              ...pm.social,
              boundaries: v as (typeof BOUNDARY_TYPES)[number],
            })
          }
          options={BOUNDARY_TYPES}
        />
      </div>
    </Subsection>
  );
};

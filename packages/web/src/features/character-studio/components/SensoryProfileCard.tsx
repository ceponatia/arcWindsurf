import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import type { TemplateSelection } from '@minimal-rpg/schemas';
import { IdentityCard } from './IdentityCard.js';
import { TemplateCardGrid } from './sensory/TemplateCardGrid.js';
import { SensoryPreviewWithAttribution } from './sensory/SensoryPreviewWithAttribution.js';
import { QuickStartSuggestions } from './sensory/QuickStartSuggestions.js';
import { Toggle } from '../../../shared/components/Toggle.js';
import {
  characterProfile,
  sensoryProfileConfig,
  resolvedBodyMap,
  updateSensoryProfileConfig,
} from '../signals.js';
import { useSensoryTemplates } from './sensory/useSensoryTemplates.js';

export const SensoryProfileCard: React.FC<{ hasContent?: boolean }> = ({ hasContent }) => {
  useSignals();

  const config = sensoryProfileConfig.value;
  const resolved = resolvedBodyMap.value;
  const profile = characterProfile.value;
  const { templates, isLoading, error } = useSensoryTemplates();

  const templateCount = config.templateBlend?.templates.length ?? 0;
  const subtitle =
    templateCount > 0
      ? `${templateCount} template${templateCount > 1 ? 's' : ''} active`
      : config.autoDefaults.enabled
        ? 'Using defaults'
        : 'Custom configuration';

  const handleTemplateChange = (nextTemplates: TemplateSelection[]) => {
    updateSensoryProfileConfig({
      templateBlend: {
        templates: nextTemplates,
        blendMode: config.templateBlend?.blendMode ?? 'weighted',
      },
    });
  };

  const handleQuickStart = (templateId: string) => {
    updateSensoryProfileConfig({
      templateBlend: {
        templates: [{ templateId, weight: 1 }],
        blendMode: config.templateBlend?.blendMode ?? 'weighted',
      },
    });
  };

  return (
    <IdentityCard
      title="Sensory Profile"
      defaultOpen={false}
      subtitle={subtitle}
      hasContent={hasContent}
    >
      {!config.templateBlend?.templates.length && templates.length > 0 && (
        <QuickStartSuggestions
          templates={templates}
          race={profile.race}
          occupation={profile.occupation}
          onSelect={handleQuickStart}
        />
      )}

      <div className="flex items-center justify-between py-2 border-b border-slate-800">
        <div>
          <span className="text-sm text-slate-300">Use sensory defaults</span>
          <p className="text-xs text-slate-500">Auto-generate based on race and traits</p>
        </div>
        <Toggle
          checked={config.autoDefaults.enabled}
          onChange={(value) =>
            updateSensoryProfileConfig({
              autoDefaults: { ...config.autoDefaults, enabled: value },
            })
          }
          ariaLabel="Toggle sensory defaults"
        />
      </div>

      <div className="mt-4">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Templates</span>
        <TemplateCardGrid
          selected={config.templateBlend?.templates ?? []}
          templates={templates}
          isLoading={isLoading}
          error={error}
          suggestedFor={{ race: profile.race, occupation: profile.occupation }}
          onChange={handleTemplateChange}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Preview</span>
        <SensoryPreviewWithAttribution
          resolved={resolved}
          regions={['hair', 'face', 'hands', 'torso']}
        />
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          className="text-sm text-violet-400 hover:text-violet-300"
          onClick={() => scrollToCard('body')}
        >
          Edit individual regions manually →
        </button>
      </div>
    </IdentityCard>
  );
};

function scrollToCard(cardId: string): void {
  const card = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

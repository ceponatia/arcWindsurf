# TASK-006: Create SensoryProfileCard Component

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 3h
**Plan**: PLAN-1.0
**Depends On**: TASK-005, TASK-007, TASK-008

---

## Description

Create the main `SensoryProfileCard` component for Character Studio. This card allows users to configure auto-defaults, select templates, and preview resolved sensory values. Placed after Classification card in IdentityPanel.

## Technical Notes

### Component Structure

```tsx
// packages/web/src/features/character-studio/components/SensoryProfileCard.tsx

import { IdentityCard } from './IdentityCard';
import { TemplateCardGrid } from './sensory/TemplateCardGrid';
import { SensoryPreviewWithAttribution } from './sensory/SensoryPreviewWithAttribution';
import { QuickStartSuggestions } from './sensory/QuickStartSuggestions';
import { Toggle } from '@/components/ui/Toggle';
import {
  sensoryProfileConfig,
  resolvedBodyMap,
  characterProfile,
  updateSensoryProfileConfig,
} from '../signals';

export const SensoryProfileCard: React.FC = () => {
  const config = sensoryProfileConfig.value;
  const resolved = resolvedBodyMap.value;
  const profile = characterProfile.value;

  const getSubtitle = () => {
    const templateCount = config.templateBlend?.templates.length ?? 0;
    if (templateCount > 0) return `${templateCount} template${templateCount > 1 ? 's' : ''} active`;
    if (config.autoDefaults.enabled) return 'Using defaults';
    return 'Custom configuration';
  };

  return (
    <IdentityCard title="Sensory Profile" defaultOpen={false} subtitle={getSubtitle()}>
      {/* Quick Start (only if no templates selected) */}
      {!config.templateBlend?.templates.length && (
        <QuickStartSuggestions
          race={profile.race}
          occupation={profile.occupation}
          onSelect={handleQuickStart}
        />
      )}

      {/* Auto-defaults toggle */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800">
        <div>
          <span className="text-sm text-slate-300">Use sensory defaults</span>
          <p className="text-xs text-slate-500">Auto-generate based on race and traits</p>
        </div>
        <Toggle
          checked={config.autoDefaults.enabled}
          onChange={(v) =>
            updateSensoryProfileConfig({
              autoDefaults: { ...config.autoDefaults, enabled: v },
            })
          }
        />
      </div>

      {/* Template selection */}
      <div className="mt-4">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Templates</span>
        <TemplateCardGrid
          selected={config.templateBlend?.templates ?? []}
          suggestedFor={{ race: profile.race, occupation: profile.occupation }}
          onChange={handleTemplateChange}
        />
      </div>

      {/* Preview with attribution */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <span className="text-xs text-slate-400 uppercase tracking-wider">Preview</span>
        <SensoryPreviewWithAttribution
          resolved={resolved}
          regions={['hair', 'skin', 'hands', 'breath']}
        />
      </div>

      {/* Link to BodyCard */}
      <div className="mt-4 text-center">
        <button
          className="text-sm text-violet-400 hover:text-violet-300"
          onClick={() => scrollToCard('body')}
        >
          Edit individual regions manually →
        </button>
      </div>
    </IdentityCard>
  );
};
```

### Card Placement in IdentityPanel

```tsx
// In IdentityPanel.tsx, after Classification card
<ClassificationCard />
<SensoryProfileCard />  {/* NEW */}
<BodyCard />
```

### Scroll Utility

```typescript
function scrollToCard(cardId: string): void {
  const card = document.querySelector(`[data-card-id="${cardId}"]`);
  card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

## Files to Create/Modify

- `packages/web/src/features/character-studio/components/SensoryProfileCard.tsx` - Create
- `packages/web/src/features/character-studio/components/IdentityPanel.tsx` - Add card
- `packages/web/src/features/character-studio/components/sensory/` - Create folder

## Dependencies

- TASK-005 (signals must exist)
- TASK-007 (TemplateCardGrid component)
- TASK-008 (SensoryPreviewWithAttribution component)

## Testing

### Manual Testing Checklist

1. [ ] Card appears in correct position in IdentityPanel
2. [ ] Card is collapsed by default
3. [ ] Toggle auto-defaults works
4. [ ] Quick Start appears for new characters
5. [ ] Templates can be selected/deselected
6. [ ] Preview updates when templates change
7. [ ] "Edit regions manually" link scrolls to BodyCard
8. [ ] Mobile layout looks correct

## Acceptance Criteria

- [ ] `SensoryProfileCard` component renders in IdentityPanel
- [ ] Card positioned after Classification, before BodyCard
- [ ] Card defaults to collapsed state (reduce cognitive load)
- [ ] Auto-defaults toggle visible and functional
- [ ] Template selection area displays available templates
- [ ] Quick Start suggestions shown for new characters
- [ ] Preview section shows resolved values with attribution
- [ ] Link to BodyCard for manual overrides
- [ ] Responsive layout works on mobile/tablet
- [ ] No visual regression in Character Studio

## Notes

- Preview regions use hair, face, hands, and torso because the current body region taxonomy does not include skin or breath.

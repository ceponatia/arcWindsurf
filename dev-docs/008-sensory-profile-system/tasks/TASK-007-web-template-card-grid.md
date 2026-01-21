# TASK-007: Create TemplateCardGrid Component

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 2.5h
**Plan**: PLAN-1.0
**Depends On**: TASK-002, TASK-004

---

## Description

Create a visual template selector component that displays sensory templates as cards with metadata, affected regions, and weight controls. Replaces basic dropdown with rich visual selection.

## Technical Notes

### Component Structure

```tsx
// packages/web/src/features/character-studio/components/sensory/TemplateCardGrid.tsx

import { useState, useEffect } from 'preact/hooks';
import type { TemplateSelection } from '@minimal-rpg/schemas';

interface TemplateCardGridProps {
  selected: TemplateSelection[];
  suggestedFor?: { race?: string; occupation?: string };
  onChange: (templates: TemplateSelection[]) => void;
}

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  suggestedFor?: { races?: string[]; occupations?: string[] };
  affectedRegions: string[];
}

export const TemplateCardGrid: React.FC<TemplateCardGridProps> = ({
  selected,
  suggestedFor,
  onChange,
}) => {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);

  useEffect(() => {
    // Fetch from API or import directly
    fetch('/api/sensory/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates));
  }, []);

  const isSelected = (id: string) => selected.some((s) => s.templateId === id);
  const getWeight = (id: string) => selected.find((s) => s.templateId === id)?.weight ?? 1;

  const isSuggested = (template: TemplateMetadata) => {
    if (!suggestedFor) return false;
    const matchesRace = template.suggestedFor?.races?.includes(suggestedFor.race ?? '');
    const matchesOccupation = template.suggestedFor?.occupations?.includes(
      suggestedFor.occupation?.toLowerCase() ?? ''
    );
    return matchesRace || matchesOccupation;
  };

  const toggleTemplate = (id: string) => {
    if (isSelected(id)) {
      onChange(selected.filter((s) => s.templateId !== id));
    } else {
      onChange([...selected, { templateId: id, weight: 1 }]);
    }
  };

  const updateWeight = (id: string, weight: number) => {
    onChange(selected.map((s) => (s.templateId === id ? { ...s, weight } : s)));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          selected={isSelected(template.id)}
          weight={getWeight(template.id)}
          suggested={isSuggested(template)}
          onToggle={() => toggleTemplate(template.id)}
          onWeightChange={(w) => updateWeight(template.id, w)}
        />
      ))}
    </div>
  );
};
```

### Individual Template Card

```tsx
interface TemplateCardProps {
  template: TemplateMetadata;
  selected: boolean;
  weight: number;
  suggested: boolean;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  selected,
  weight,
  suggested,
  onToggle,
  onWeightChange,
}) => (
  <div
    className={clsx(
      'p-3 rounded-lg border cursor-pointer transition-colors',
      selected
        ? 'border-violet-500 bg-violet-900/20'
        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
    )}
    onClick={onToggle}
  >
    {/* Header */}
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-medium text-slate-200">{template.name}</h4>
        {suggested && <span className="text-xs text-emerald-400">✨ Suggested for you</span>}
      </div>
      {selected && <CheckIcon className="w-5 h-5 text-violet-400" />}
    </div>

    {/* Description */}
    <p className="text-xs text-slate-400 mt-1">{template.description}</p>

    {/* Affected regions */}
    <div className="flex flex-wrap gap-1 mt-2">
      {template.affectedRegions.map((region) => (
        <span key={region} className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">
          {region}
        </span>
      ))}
    </div>

    {/* Weight slider (only when selected) */}
    {selected && (
      <div className="mt-3 pt-2 border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center justify-between text-xs text-slate-400">
          <span>Intensity</span>
          <span>{Math.round(weight * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={weight}
          onChange={(e) => onWeightChange(parseFloat(e.currentTarget.value))}
          className="w-full mt-1"
        />
      </div>
    )}
  </div>
);
```

## Files to Create

- `packages/web/src/features/character-studio/components/sensory/TemplateCardGrid.tsx`
- `packages/web/src/features/character-studio/components/sensory/TemplateCard.tsx` (optional split)

## Dependencies

- TASK-002 (template data structure)
- TASK-004 (API endpoint for fetching templates)

## Testing

### Manual Testing Checklist

1. [ ] Templates load from API
2. [ ] Cards display all metadata correctly
3. [ ] "Suggested" badge appears for matching templates
4. [ ] Click toggles selection
5. [ ] Weight slider appears when selected
6. [ ] Weight changes persist
7. [ ] Multiple selection works
8. [ ] Grid is responsive on different screen sizes

## Acceptance Criteria

- [ ] `TemplateCardGrid` component renders available templates as cards
- [ ] Each card shows: name, description, tags, affected regions
- [ ] "Suggested for you" badge appears when template matches character traits
- [ ] Selected templates show checkmark and weight slider
- [ ] Weight slider allows 0-100% adjustment
- [ ] Multiple templates can be selected simultaneously
- [ ] Conflict warning icon shows when templates overlap on same regions
- [x] Templates fetched from API or imported from schemas
- [ ] Responsive grid layout (2 cols on mobile, 3-4 on desktop)

## Validation Notes

- UI rendering and interaction checks were not executed because the app was not running in a browser session.
- Suggested badges, weight slider behavior, conflict warnings, and responsive layout require UI validation.

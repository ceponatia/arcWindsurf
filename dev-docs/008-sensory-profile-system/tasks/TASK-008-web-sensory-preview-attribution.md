# TASK-008: Create SensoryPreviewWithAttribution Component

**Priority**: P2
**Status**: ✅ Ready for Review
**Estimate**: 2h
**Plan**: PLAN-1.0
**Depends On**: TASK-003, TASK-005

---

## Description

Create a preview component that displays resolved sensory values with attribution, showing users exactly where each value comes from (race defaults, templates, or manual overrides).

## Technical Notes

### Component Structure

```tsx
// packages/web/src/features/character-studio/components/sensory/SensoryPreviewWithAttribution.tsx

import { useState } from 'preact/hooks';
import type { ResolvedBodyMap } from '@minimal-rpg/schemas';

interface SensoryPreviewWithAttributionProps {
  resolved: ResolvedBodyMap;
  regions: string[]; // e.g., ['hair', 'skin', 'hands', 'breath']
}

export const SensoryPreviewWithAttribution: React.FC<SensoryPreviewWithAttributionProps> = ({
  resolved,
  regions,
}) => {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  return (
    <div className="space-y-2 mt-2">
      {regions.map((regionKey) => {
        const region = resolved[regionKey];
        if (!region) return null;

        const isExpanded = expandedRegion === regionKey;

        return (
          <RegionPreview
            key={regionKey}
            regionKey={regionKey}
            region={region}
            expanded={isExpanded}
            onToggle={() => setExpandedRegion(isExpanded ? null : regionKey)}
          />
        );
      })}
    </div>
  );
};
```

### Region Preview Component

```tsx
interface RegionPreviewProps {
  regionKey: string;
  region: ResolvedRegionData;
  expanded: boolean;
  onToggle: () => void;
}

const RegionPreview: React.FC<RegionPreviewProps> = ({ regionKey, region, expanded, onToggle }) => {
  const senses = ['scent', 'visual', 'texture', 'taste', 'sound'] as const;
  const activeSenses = senses.filter((s) => region[s]?.description);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        className="w-full flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-800"
        onClick={onToggle}
      >
        <span className="font-medium text-slate-200 capitalize">{regionKey}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {activeSenses.length} sense{activeSenses.length !== 1 ? 's' : ''}
          </span>
          <ChevronIcon className={clsx('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 space-y-2 bg-slate-900/50">
          {activeSenses.map((sense) => (
            <SenseRow key={sense} sense={sense} data={region[sense]} />
          ))}
          {activeSenses.length === 0 && (
            <p className="text-xs text-slate-500 italic">No sensory data defined</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### Sense Row with Attribution

```tsx
interface SenseRowProps {
  sense: string;
  data?: { description: string; _attribution?: string[] };
}

const SenseRow: React.FC<SenseRowProps> = ({ sense, data }) => {
  if (!data?.description) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <SenseIcon sense={sense} className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 uppercase">{sense}</span>
      </div>
      <p className="text-sm text-slate-200 pl-6">{data.description}</p>
      {data._attribution?.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {data._attribution.map((source, i) => (
            <AttributionBadge key={i} source={source} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Attribution Badge

```tsx
const AttributionBadge: React.FC<{ source: string }> = ({ source }) => {
  // Parse source format: "race:Elf", "template:woodland-spirit", "override"
  const [type, value] = source.includes(':') ? source.split(':') : [source, null];

  const colors = {
    race: 'bg-blue-900/50 text-blue-300 border-blue-700',
    template: 'bg-purple-900/50 text-purple-300 border-purple-700',
    override: 'bg-amber-900/50 text-amber-300 border-amber-700',
    default: 'bg-slate-700 text-slate-300 border-slate-600',
  };

  const color = colors[type as keyof typeof colors] ?? colors.default;
  const label = value ? `${type}: ${value}` : type;

  return <span className={clsx('text-xs px-1.5 py-0.5 rounded border', color)}>{label}</span>;
};
```

## Files to Create

- `packages/web/src/features/character-studio/components/sensory/SensoryPreviewWithAttribution.tsx`
- `packages/web/src/features/character-studio/components/sensory/AttributionBadge.tsx` (optional)

## Dependencies

- TASK-003 (resolver with attribution)
- TASK-005 (resolvedBodyMap signal)

## Testing

### Manual Testing Checklist

1. [ ] Preview shows correct regions
2. [ ] Click expands/collapses region
3. [ ] All active senses displayed
4. [ ] Attribution badges show correct sources
5. [ ] Badge colors match source type
6. [ ] Empty regions show placeholder
7. [ ] Updates when templates/overrides change

## Acceptance Criteria

- [ ] `SensoryPreviewWithAttribution` component renders resolved values
- [ ] Each sense shows description + source attribution
- [ ] Attribution uses visual badges: "Race", "Template: X", "Override"
- [ ] Collapsed by default to save space, expandable per-region
- [ ] Shows subset of regions (configurable via props)
- [ ] Empty/missing values show placeholder text
- [ ] Visual styling matches Character Studio theme

## Notes

- The preview omits a sound sense because the current BodyRegionData schema only supports visual, scent, texture, and flavor.

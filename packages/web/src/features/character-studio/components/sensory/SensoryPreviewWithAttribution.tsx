import React, { useState } from 'react';
import { ChevronDown, Eye, Hand, Utensils, Wind } from 'lucide-react';
import { getRecordOptional } from '@minimal-rpg/schemas';
import type { BodyRegion, ResolvedBodyMap, ResolvedRegionData } from '@minimal-rpg/schemas';
import { AttributionBadge } from './AttributionBadge.js';

interface SensoryPreviewWithAttributionProps {
  resolved: ResolvedBodyMap;
  regions: BodyRegion[];
}

type SenseKey = 'scent' | 'visual' | 'texture' | 'flavor';
const SENSE_ORDER: SenseKey[] = ['scent', 'visual', 'texture', 'flavor'];

export const SensoryPreviewWithAttribution: React.FC<SensoryPreviewWithAttributionProps> = ({
  resolved,
  regions,
}) => {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  return (
    <div className="space-y-2 mt-2">
      {regions.map((regionKey) => {
        const region = getRecordOptional(resolved, regionKey) as ResolvedRegionData | undefined;
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

interface RegionPreviewProps {
  regionKey: string;
  region: ResolvedRegionData;
  expanded: boolean;
  onToggle: () => void;
}

const RegionPreview: React.FC<RegionPreviewProps> = ({ regionKey, region, expanded, onToggle }) => {
  const activeSenses = SENSE_ORDER.filter((sense) => {
    const data = getRecordOptional(region, sense);
    return Boolean(data && ('description' in data || 'primary' in data));
  });

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-2 bg-slate-800/50 hover:bg-slate-800"
        onClick={onToggle}
      >
        <span className="font-medium text-slate-200 capitalize">{formatRegion(regionKey)}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {activeSenses.length} sense{activeSenses.length !== 1 ? 's' : ''}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="p-3 space-y-2 bg-slate-900/50">
          {activeSenses.map((sense) => {
            const data = getRecordOptional(region, sense);
            if (!data) return null;
            return <SenseRow key={sense} sense={sense} data={data} />;
          })}
          {activeSenses.length === 0 && (
            <p className="text-xs text-slate-500 italic">No sensory data defined</p>
          )}
        </div>
      )}
    </div>
  );
};

interface SenseRowProps {
  sense: SenseKey;
  data: { description?: string; primary?: string; _attribution?: string[] };
}

const SenseRow: React.FC<SenseRowProps> = ({ sense, data }) => {
  const description = data.description ?? data.primary;
  if (!description) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <SenseIcon sense={sense} />
        <span className="text-xs text-slate-400 uppercase">{sense}</span>
      </div>
      <p className="text-sm text-slate-200 pl-6">{description}</p>
      {data._attribution?.length ? (
        <div className="flex flex-wrap gap-1 pl-6">
          {data._attribution.map((source, index) => (
            <AttributionBadge key={`${source}-${index}`} source={source} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SenseIcon: React.FC<{ sense: SenseKey }> = ({ sense }) => {
  const className = 'w-4 h-4 text-slate-400';
  switch (sense) {
    case 'visual':
      return <Eye className={className} />;
    case 'texture':
      return <Hand className={className} />;
    case 'flavor':
      return <Utensils className={className} />;
    default:
      return <Wind className={className} />;
  }
};

function formatRegion(regionKey: string): string {
  return regionKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
}

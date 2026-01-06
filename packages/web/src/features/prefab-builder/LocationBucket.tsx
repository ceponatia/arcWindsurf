/**
 * Location Bucket Panel
 * Draggable list of available locations for the prefab builder.
 */
import { useState, type DragEvent } from 'react';
import {
  MapPin,
  Building2,
  DoorOpen,
  Mountain,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Square,
} from 'lucide-react';
import type { Location, LocationType, LocationBucketProps } from './types.js';

/** Get icon for location type */
function LocationIcon({ type, className }: { type: LocationType; className?: string }) {
  switch (type) {
    case 'region':
      return <Mountain className={className} />;
    case 'building':
      return <Building2 className={className} />;
    case 'room':
      return <DoorOpen className={className} />;
    default:
      return <MapPin className={className} />;
  }
}

/** Get color for location type */
function getTypeColor(type: LocationType): string {
  switch (type) {
    case 'region':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'building':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'room':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }
}

/** Draggable location card */
interface LocationCardProps {
  location: Location;
  isTemplate?: boolean;
}

function LocationCard({ location, isTemplate }: LocationCardProps) {
  const handleDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify(location));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const colorClass = getTypeColor(location.type);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        flex items-start gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing
        ${colorClass}
        hover:ring-1 hover:ring-white/20
        transition-all duration-150
      `}
    >
      <LocationIcon type={location.type} className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{location.name}</span>
          {isTemplate && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
              Template
            </span>
          )}
        </div>
        {location.summary && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{location.summary}</p>
        )}
      </div>
    </div>
  );
}

export function LocationBucket({
  locations,
  templateLocations,
  isLoading,
  onRefresh,
  onAddBlankNode,
  onDragBlankNode,
}: LocationBucketProps) {
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(true);
  const [showCustom, setShowCustom] = useState(true);
  const [filterType, setFilterType] = useState<LocationType | 'all'>('all');

  // Handle drag start for blank node
  const handleBlankNodeDragStart = (event: DragEvent) => {
    const blankLocation = onDragBlankNode();
    event.dataTransfer.setData('application/json', JSON.stringify(blankLocation));
    event.dataTransfer.effectAllowed = 'copy';
  };

  // Filter locations
  const filterLocations = (locs: Location[]) => {
    return locs.filter((loc) => {
      const matchesSearch =
        search === '' ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.summary?.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || loc.type === filterType;
      return matchesSearch && matchesType;
    });
  };

  const filteredTemplates = filterLocations(templateLocations);
  const filteredCustom = filterLocations(locations);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-200">Locations</h3>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50"
            title="Refresh locations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            placeholder="Search locations..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {(['all', 'region', 'building', 'room'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); }}
              className={`
                px-2 py-1 text-xs rounded-md capitalize
                ${filterType === type ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
              `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Location lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Templates section */}
            <div>
              <button
                onClick={() => { setShowTemplates(!showTemplates); }}
                className="flex items-center gap-2 w-full text-left mb-2"
              >
                {showTemplates ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-300">Templates</span>
                <span className="text-xs text-slate-500">({filteredTemplates.length})</span>
              </button>

              {showTemplates && (
                <div className="space-y-1.5 ml-2">
                  {filteredTemplates.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No templates found</p>
                  ) : (
                    filteredTemplates.map((loc) => (
                      <LocationCard key={loc.id} location={loc} isTemplate />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Custom locations section */}
            <div>
              <button
                onClick={() => { setShowCustom(!showCustom); }}
                className="flex items-center gap-2 w-full text-left mb-2"
              >
                {showCustom ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-300">Your Locations</span>
                <span className="text-xs text-slate-500">({filteredCustom.length})</span>
              </button>

              {showCustom && (
                <div className="space-y-1.5 ml-2">
                  {filteredCustom.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      No custom locations yet. Create one below!
                    </p>
                  ) : (
                    filteredCustom.map((loc) => <LocationCard key={loc.id} location={loc} />)
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Blank node box - draggable and clickable */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 mb-2">Add new location:</p>
        <div
          draggable
          onDragStart={handleBlankNodeDragStart}
          onClick={onAddBlankNode}
          className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 text-slate-400 hover:border-violet-500 hover:text-violet-400 hover:bg-violet-500/10 cursor-pointer active:cursor-grabbing transition-all"
        >
          <Square className="w-5 h-5" />
          <span className="text-sm font-medium">New Location</span>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">Drag onto canvas or click to add</p>
      </div>
    </div>
  );
}

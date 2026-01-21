import React, { useEffect, useMemo, useState } from 'react';
import type { TemplateSelection } from '@minimal-rpg/schemas';
import { TemplateCard } from './TemplateCard.js';
import type { TemplateMetadata } from './useSensoryTemplates.js';
import { useDragScroll } from './useDragScroll.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TemplateCardGridProps {
  selected: TemplateSelection[];
  templates: TemplateMetadata[];
  isLoading?: boolean;
  error?: string | null;
  suggestedFor?: { race?: string | undefined; occupation?: string | undefined };
  onChange: (templates: TemplateSelection[]) => void;
}

export const TemplateCardGrid: React.FC<TemplateCardGridProps> = ({
  selected,
  templates,
  isLoading,
  error,
  suggestedFor,
  onChange,
}) => {
  const [query, setQuery] = useState<string>('');
  const [suggestedOnly, setSuggestedOnly] = useState<boolean>(false);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);

  const tagsScroll = useDragScroll({ dragThresholdPx: 4 });
  const regionsScroll = useDragScroll({ dragThresholdPx: 4 });
  const templatesScroll = useDragScroll({ dragThresholdPx: 6 });

  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const selectedIds = useMemo(() => new Set(selected.map((entry) => entry.templateId)), [selected]);

  const selectedTemplates = useMemo(
    () => templates.filter((template) => selectedIds.has(template.id)),
    [templates, selectedIds]
  );

  const conflicts = useMemo(() => {
    const conflictIds = new Set<string>();
    for (const template of selectedTemplates) {
      for (const other of selectedTemplates) {
        if (template.id === other.id) continue;
        const overlap = template.affectedRegions.some((region) =>
          other.affectedRegions.includes(region)
        );
        if (overlap) {
          conflictIds.add(template.id);
        }
      }
    }
    return conflictIds;
  }, [selectedTemplates]);

  const isSelected = (id: string) => selectedIds.has(id);
  const getWeight = (id: string) => selected.find((s) => s.templateId === id)?.weight ?? 1;

  const isSuggested = (template: TemplateMetadata) => {
    if (!suggestedFor) return false;
    const race = suggestedFor.race;
    const occupation = suggestedFor.occupation?.toLowerCase();
    const matchesRace = race ? template.suggestedFor?.races?.includes(race) : false;
    const matchesOccupation = occupation
      ? template.suggestedFor?.occupations?.includes(occupation)
      : false;
    return matchesRace ? true : matchesOccupation;
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const template of templates) {
      for (const tag of template.tags) set.add(tag);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const allRegions = useMemo(() => {
    const set = new Set<string>();
    for (const template of templates) {
      for (const region of template.affectedRegions) set.add(region);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      if (suggestedOnly && !isSuggested(template)) return false;

      if (tagFilters.length > 0) {
        const hasAnyTag = tagFilters.some((tag) => template.tags.includes(tag));
        if (!hasAnyTag) return false;
      }

      if (regionFilters.length > 0) {
        const hasAnyRegion = regionFilters.some((region) =>
          template.affectedRegions.includes(region)
        );
        if (!hasAnyRegion) return false;
      }

      if (!normalizedQuery) return true;

      const haystacks: string[] = [template.name, template.description];
      haystacks.push(template.tags.join(' '));
      haystacks.push(template.affectedRegions.join(' '));

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [isSuggested, query, regionFilters, suggestedOnly, tagFilters, templates]);

  const toggleStringFilter = (
    current: string[],
    value: string,
    setNext: (next: string[]) => void
  ) => {
    if (current.includes(value)) {
      setNext(current.filter((entry) => entry !== value));
      return;
    }
    setNext([...current, value]);
  };

  useEffect(() => {
    const el = templatesScroll.ref.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      const epsilon = 2;
      setCanScrollLeft(left > epsilon);
      setCanScrollRight(left < max - epsilon);
    };

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [filteredTemplates.length, templatesScroll.ref]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = templatesScroll.ref.current;
    if (!el) return;

    // Try to scroll by exactly one card stride so snap feels intentional.
    const first = el.querySelector<HTMLElement>('[data-template-card="true"]');
    let stride = 292; // default: ~280px card + 12px gap
    if (first) {
      stride = Math.max(220, first.getBoundingClientRect().width + 12);
    }

    el.scrollBy({ left: direction * stride, behavior: 'smooth' });
  };

  const toggleTemplate = (id: string) => {
    // Single-select behavior: selecting a new template deselects the previous one.
    if (isSelected(id)) {
      onChange([]);
      return;
    }

    const existingWeight = selected.find((entry) => entry.templateId === id)?.weight;
    onChange([{ templateId: id, weight: existingWeight ?? 1 }]);
  };

  const updateWeight = (id: string, weight: number) => {
    const normalized = Math.min(1, Math.max(0, weight));
    onChange(
      selected.map((entry) => (entry.templateId === id ? { ...entry, weight: normalized } : entry))
    );
  };

  if (isLoading) {
    return <p className="text-xs text-slate-500">Loading templates...</p>;
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>;
  }

  if (templates.length === 0) {
    return <p className="text-xs text-slate-500">No templates available.</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-2">
        <label className="block">
          <span className="sr-only">Search templates</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={
              suggestedOnly
                ? 'text-xs px-2 py-1 rounded bg-emerald-900/30 text-emerald-300 ring-1 ring-emerald-700'
                : 'text-xs px-2 py-1 rounded bg-slate-800/60 text-slate-300 ring-1 ring-slate-700 hover:ring-slate-600'
            }
            onClick={() => setSuggestedOnly((prev) => !prev)}
          >
            Suggested
          </button>

          {(query.trim() || suggestedOnly || tagFilters.length > 0 || regionFilters.length > 0) && (
            <button
              type="button"
              className="text-xs px-2 py-1 rounded bg-slate-800/60 text-slate-300 ring-1 ring-slate-700 hover:ring-slate-600"
              onClick={() => {
                setQuery('');
                setSuggestedOnly(false);
                setTagFilters([]);
                setRegionFilters([]);
              }}
            >
              Clear
            </button>
          )}

          <span className="text-xs text-slate-500">
            {filteredTemplates.length} of {templates.length}
          </span>
        </div>

        {allTags.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Tags</div>
            <div
              ref={tagsScroll.ref}
              className={
                'mt-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none cursor-grab ' +
                (tagsScroll.isDragging ? 'cursor-grabbing' : '')
              }
              style={{ touchAction: 'pan-y' }}
              {...tagsScroll.containerProps}
            >
              {allTags.map((tag) => {
                const active = tagFilters.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={
                      active
                        ? 'flex-none text-xs px-2 py-1 rounded bg-violet-900/30 text-violet-300 ring-1 ring-violet-700'
                        : 'flex-none text-xs px-2 py-1 rounded bg-slate-800/60 text-slate-300 ring-1 ring-slate-700 hover:ring-slate-600'
                    }
                    onClick={() => toggleStringFilter(tagFilters, tag, setTagFilters)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {allRegions.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Regions</div>
            <div
              ref={regionsScroll.ref}
              className={
                'mt-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none cursor-grab ' +
                (regionsScroll.isDragging ? 'cursor-grabbing' : '')
              }
              style={{ touchAction: 'pan-y' }}
              {...regionsScroll.containerProps}
            >
              {allRegions.map((region) => {
                const active = regionFilters.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    className={
                      active
                        ? 'flex-none text-xs px-2 py-1 rounded bg-violet-900/30 text-violet-300 ring-1 ring-violet-700'
                        : 'flex-none text-xs px-2 py-1 rounded bg-slate-800/60 text-slate-300 ring-1 ring-slate-700 hover:ring-slate-600'
                    }
                    onClick={() => toggleStringFilter(regionFilters, region, setRegionFilters)}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-3">
        {/* Fades */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent"
            aria-hidden="true"
          />
        )}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-slate-950 via-slate-950/60 to-transparent"
            aria-hidden="true"
          />
        )}

        {/* Prev/Next buttons */}
        <button
          type="button"
          aria-label="Previous templates"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollLeft}
          className={
            'absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full ring-1 ring-slate-700 bg-slate-900/70 text-slate-200 flex items-center justify-center transition ' +
            (canScrollLeft
              ? 'hover:bg-slate-900/90 hover:ring-slate-600'
              : 'opacity-0 pointer-events-none')
          }
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next templates"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollRight}
          className={
            'absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full ring-1 ring-slate-700 bg-slate-900/70 text-slate-200 flex items-center justify-center transition ' +
            (canScrollRight
              ? 'hover:bg-slate-900/90 hover:ring-slate-600'
              : 'opacity-0 pointer-events-none')
          }
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={templatesScroll.ref}
          className={
            'overflow-x-auto py-3 scrollbar-none select-none cursor-grab scroll-smooth ' +
            (templatesScroll.isDragging ? 'cursor-grabbing' : '')
          }
          style={{
            touchAction: 'pan-y',
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: 44,
            scrollPaddingRight: 44,
          }}
          {...templatesScroll.containerProps}
        >
          <div className="flex items-center gap-3 min-w-max px-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                data-template-card="true"
                className="flex-none w-[260px] sm:w-[280px] aspect-[5/7]"
                style={{ scrollSnapAlign: 'start' }}
              >
                <TemplateCard
                  template={template}
                  selected={isSelected(template.id)}
                  weight={getWeight(template.id)}
                  hasConflict={conflicts.has(template.id)}
                  onToggle={() => toggleTemplate(template.id)}
                  onWeightChange={(nextWeight) => updateWeight(template.id, nextWeight)}
                />
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">No templates match your filters.</p>
          )}
        </div>
      </div>
    </div>
  );
};

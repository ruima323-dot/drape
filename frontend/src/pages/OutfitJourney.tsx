import { useState, useEffect, useCallback } from 'react';
import type { JourneyEntry } from '@drape/shared';
import { api } from '../lib/api';
import Timeline from '../components/journey/Timeline';
import type { MonthGroup } from '../components/journey/Timeline';
import FilterChips from '../components/journey/FilterChips';
import type { FilterValue } from '../components/journey/FilterChips';
import JourneyEmptyState from '../components/journey/JourneyEmptyState';
import StyleInsights from '../components/journey/StyleInsights';

interface SavedOutfitResponse {
  groups: {
    month: number;
    year: number;
    label: string;
    entries: JourneyEntry[];
  }[];
}

export default function OutfitJourney() {
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutfits = useCallback(async (filter: FilterValue) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParam =
        filter !== 'all' ? `?occasionContext=${filter}` : '';
      const data = await api.get<SavedOutfitResponse>(
        `/outfits/saved${queryParam}`,
      );
      setGroups(data.groups);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your outfit journey.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutfits(activeFilter);
  }, [activeFilter, fetchOutfits]);

  const handleFilterChange = (filter: FilterValue) => {
    setActiveFilter(filter);
  };

  const handleExpandOutfit = async (outfitId: string) => {
    // Fetch full detail for the expanded outfit and enrich the local state
    try {
      const detail = await api.get<{ entry: JourneyEntry }>(
        `/outfits/saved/${outfitId}`,
      );

      if (detail.entry) {
        setGroups((prev) =>
          prev.map((group) => ({
            ...group,
            entries: group.entries.map((entry) => {
              if (entry.id !== outfitId) return entry;
              return { ...entry, ...detail.entry };
            }),
          })),
        );
      }
    } catch {
      // Silently fail — the card will still show the collapsed data
    }
  };

  const handleDeleteEntry = async (id: string) => {
    // Find the entry to determine its type
    let entryType: 'generated' | 'photo' | undefined;
    for (const group of groups) {
      const entry = group.entries.find((e) => e.id === id);
      if (entry) {
        entryType = entry.type;
        break;
      }
    }

    if (!entryType) return;

    try {
      const endpoint =
        entryType === 'photo' ? `/photos/${id}` : `/outfits/saved/${id}`;
      await api.delete(endpoint);

      // Remove from local state
      setGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            entries: group.entries.filter((entry) => entry.id !== id),
          }))
          .filter((group) => group.entries.length > 0),
      );
    } catch {
      // Could show a toast here; for now silently fail
    }
  };

  const totalEntries = groups.reduce(
    (sum, g) => sum + g.entries.length,
    0,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-semibold text-charcoal">
        Outfit Journey
      </h1>

      {/* Filter chips — always visible */}
      <FilterChips
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Style Insights — above the timeline */}
      <StyleInsights />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-3 text-charcoal-muted">
            <svg
              className="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Loading your journey…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="drape-card text-center py-8">
          <p className="text-charcoal-muted mb-3">{error}</p>
          <button
            onClick={() => fetchOutfits(activeFilter)}
            className="text-sm text-gold hover:text-gold-muted transition-colors font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && totalEntries === 0 && (
        <JourneyEmptyState />
      )}

      {/* Timeline */}
      {!isLoading && !error && totalEntries > 0 && (
        <Timeline
          groups={groups}
          onExpandOutfit={handleExpandOutfit}
          onDeleteEntry={handleDeleteEntry}
        />
      )}
    </div>
  );
}

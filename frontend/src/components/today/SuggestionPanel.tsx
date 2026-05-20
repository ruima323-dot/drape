import { useState, useEffect, useCallback } from 'react';
import type { AccessorySuggestion } from '@drape/shared';
import { api } from '../../lib/api';

interface SuggestionPanelProps {
  outfitId: string | null;
  onAddSuggestion: (suggestion: AccessorySuggestion) => void;
  /** Increment this value to trigger a re-fetch of suggestions */
  refreshKey?: number;
}

export default function SuggestionPanel({
  outfitId,
  onAddSuggestion,
  refreshKey = 0,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<AccessorySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!outfitId) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.get<{ suggestions: AccessorySuggestion[] }>(
        `/recommendations/accessories?outfitId=${encodeURIComponent(outfitId)}`,
      );
      setSuggestions(data.suggestions ?? []);
    } catch {
      // Silently fail — suggestions are non-critical
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [outfitId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions, refreshKey]);

  const handleAdd = async (suggestion: AccessorySuggestion) => {
    setAddingId(suggestion.accessory.id);
    try {
      onAddSuggestion(suggestion);
    } finally {
      setAddingId(null);
    }
  };

  if (!outfitId) return null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-charcoal-muted">
          Suggested Accessories
        </h3>
        <div className="flex items-center gap-2 text-charcoal-muted text-sm py-3">
          <svg
            className="animate-spin h-4 w-4"
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
          Finding accessories that complement your look...
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-charcoal-muted">
        Suggested Accessories
      </h3>
      <div className="space-y-2" role="list" aria-label="Accessory suggestions">
        {suggestions.map((suggestion) => {
          const { accessory } = suggestion;
          const isAdding = addingId === accessory.id;

          return (
            <div
              key={accessory.id}
              role="listitem"
              className="flex items-center gap-3 p-3 bg-white border border-cream-200 rounded-card hover:shadow-card transition-shadow"
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">
                {accessory.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">
                  {accessory.label}
                </p>
                <p className="text-xs text-charcoal-muted line-clamp-2">
                  {suggestion.explanation}
                </p>
              </div>
              <button
                onClick={() => handleAdd(suggestion)}
                disabled={isAdding}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gold border border-gold rounded-pill hover:bg-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Add ${accessory.label}`}
              >
                {isAdding ? '...' : 'Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

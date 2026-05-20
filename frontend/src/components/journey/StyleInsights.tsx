import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StyleInsightsData {
  summary: string;
  topColors: { color: string; count: number }[];
  topTypes: { type: string; count: number }[];
  insight: string;
  suggestion?: string;
  occasionBreakdown: { work: number; casual: number; night_out: number };
}

interface StyleInsightsResponse {
  hasEnoughData: boolean;
  data?: StyleInsightsData;
}

// ─── Color mapping for display ───────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  black: '#2D2D2D',
  white: '#F5F5F5',
  navy: '#1B2A4A',
  charcoal: '#4A4A4A',
  grey: '#8B8B8B',
  gray: '#8B8B8B',
  beige: '#D4C5A9',
  cream: '#FAF7F2',
  brown: '#6B4226',
  tan: '#C4A07A',
  red: '#A83232',
  burgundy: '#6B1A2A',
  blue: '#3B5998',
  green: '#4A7C59',
  olive: '#6B7B3A',
  pink: '#C77D8E',
  purple: '#6B21A8',
  gold: '#C9A96E',
  silver: '#A8A8A8',
  orange: '#C76B32',
  yellow: '#C7A832',
  khaki: '#B8A87A',
  denim: '#4A6B8A',
};

function getColorHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  return COLOR_MAP[normalized] ?? '#8B8B8B';
}

// ─── Occasion bar colors ─────────────────────────────────────────────────────

const OCCASION_COLORS = {
  work: '#64748B',
  casual: '#A3785A',
  night_out: '#6B21A8',
};

const OCCASION_LABELS = {
  work: 'Work',
  casual: 'Casual',
  night_out: 'Night Out',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function StyleInsights() {
  const [data, setData] = useState<StyleInsightsData | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInsights = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const queryParam = refresh ? '?refresh=true' : '';
      const response = await api.get<StyleInsightsResponse>(
        `/insights/style${queryParam}`
      );

      setHasEnoughData(response.hasEnoughData);
      setData(response.data ?? null);
    } catch {
      // Silently fail — insights are supplementary
      setHasEnoughData(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Loading state — minimal
  if (isLoading) {
    return null;
  }

  // Not enough data
  if (hasEnoughData === false) {
    return (
      <div className="drape-card text-center py-6 px-4">
        <p className="text-sm text-charcoal-muted italic">
          Keep documenting your outfits — style insights unlock after 3 entries.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const totalOccasions =
    data.occasionBreakdown.work +
    data.occasionBreakdown.casual +
    data.occasionBreakdown.night_out;

  return (
    <div className="drape-card p-card-lg space-y-5">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-charcoal">
          Style Insights
        </h2>
        <button
          onClick={() => fetchInsights(true)}
          disabled={isRefreshing}
          className="text-xs text-charcoal-muted hover:text-gold transition-colors disabled:opacity-50"
          aria-label="Refresh style insights"
        >
          {isRefreshing ? (
            <span className="flex items-center gap-1">
              <svg
                className="animate-spin h-3 w-3"
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
              Analyzing…
            </span>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Summary */}
      <p className="text-base font-display text-charcoal leading-relaxed">
        {data.summary}
      </p>

      {/* Top Colors */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
          Top Colors
        </h3>
        <div className="flex items-center gap-4">
          {data.topColors.map((c) => (
            <div key={c.color} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-cream-300"
                style={{ backgroundColor: getColorHex(c.color) }}
                aria-label={c.color}
              />
              <span className="text-sm text-charcoal">
                {c.color}
                <span className="text-charcoal-muted ml-1">({c.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Types */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
          Top Pieces
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          {data.topTypes.map((t) => (
            <span
              key={t.type}
              className="text-sm text-charcoal bg-cream-200 px-2.5 py-1 rounded-pill"
            >
              {t.type}
              <span className="text-charcoal-muted ml-1">({t.count})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Occasion Breakdown Bar */}
      {totalOccasions > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide">
            Occasion Breakdown
          </h3>
          <div className="flex h-3 rounded-pill overflow-hidden bg-cream-200">
            {(Object.keys(OCCASION_COLORS) as Array<keyof typeof OCCASION_COLORS>).map(
              (occasion) => {
                const count = data.occasionBreakdown[occasion];
                if (count === 0) return null;
                const percentage = (count / totalOccasions) * 100;
                return (
                  <div
                    key={occasion}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: OCCASION_COLORS[occasion],
                    }}
                    title={`${OCCASION_LABELS[occasion]}: ${count}`}
                    aria-label={`${OCCASION_LABELS[occasion]}: ${count} outfits`}
                  />
                );
              }
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-charcoal-muted">
            {(Object.keys(OCCASION_COLORS) as Array<keyof typeof OCCASION_COLORS>).map(
              (occasion) => {
                const count = data.occasionBreakdown[occasion];
                if (count === 0) return null;
                return (
                  <div key={occasion} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: OCCASION_COLORS[occasion] }}
                    />
                    <span>
                      {OCCASION_LABELS[occasion]} ({count})
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Deeper Insight */}
      <p className="text-sm italic text-charcoal-muted leading-relaxed border-t border-cream-200 pt-4">
        {data.insight}
      </p>

      {/* Suggestion */}
      {data.suggestion && (
        <div className="flex items-start gap-2 bg-cream-50 rounded-card p-3 mt-3">
          <span className="text-base flex-shrink-0" aria-hidden="true">💡</span>
          <p className="text-sm text-charcoal leading-relaxed">
            {data.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}

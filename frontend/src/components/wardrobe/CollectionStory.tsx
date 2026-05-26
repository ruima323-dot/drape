import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface FundamentalItem {
  category: string;
  description: string;
  owned: boolean;
  ownedItem?: string;
  chapter: number;
  emoji: string;
}

interface FundamentalsData {
  collectionName: string;
  narrative: string;
  items: FundamentalItem[];
  completionPercent: number;
}

export default function CollectionStory() {
  const [data, setData] = useState<FundamentalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ fundamentals: FundamentalsData | null }>('/fundamentals')
      .then((res) => {
        if (res.fundamentals) {
          setData(res.fundamentals);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="drape-card animate-pulse space-y-4">
        <div className="h-5 bg-cream-300 rounded w-2/5" />
        <div className="h-3 bg-cream-200 rounded w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-cream-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ownedCount = data.items.filter((i) => i.owned).length;
  const totalCount = data.items.length;

  return (
    <div className="drape-card space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-display font-semibold text-charcoal">
            {data.collectionName}
          </h3>
          <span className="text-xs font-medium text-charcoal-muted bg-cream-200 px-2 py-0.5 rounded-pill">
            {ownedCount}/{totalCount} collected
          </span>
        </div>
        <p className="text-sm text-charcoal-muted italic">
          {data.narrative}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-cream-200 rounded-pill overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-muted rounded-pill transition-all duration-700"
            style={{ width: `${data.completionPercent}%` }}
          />
        </div>
        <p className="text-xs text-charcoal-muted mt-1.5 text-right">
          {data.completionPercent}% complete
        </p>
      </div>

      {/* Chapters */}
      <div className="space-y-2">
        {data.items.map((item) => {
          const isExpanded = expandedChapter === item.chapter;

          return (
            <button
              key={item.chapter}
              onClick={() => setExpandedChapter(isExpanded ? null : item.chapter)}
              className={`w-full text-left rounded-card border transition-all ${
                item.owned
                  ? 'border-gold/30 bg-cream-50'
                  : 'border-cream-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Chapter indicator */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  item.owned
                    ? 'bg-gold/20 text-gold'
                    : 'bg-cream-200 text-charcoal-muted'
                }`}>
                  {item.owned ? '✓' : item.chapter}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" aria-hidden="true">{item.emoji}</span>
                    <span className={`text-sm font-medium truncate ${
                      item.owned ? 'text-charcoal' : 'text-charcoal-muted'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  {item.owned && item.ownedItem && (
                    <p className="text-xs text-charcoal-muted mt-0.5 truncate pl-6">
                      ↳ {item.ownedItem}
                    </p>
                  )}
                </div>

                {/* Expand indicator */}
                <svg
                  className={`w-4 h-4 text-charcoal-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Expanded description */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-0">
                  <p className="text-xs text-charcoal-muted leading-relaxed pl-11">
                    {item.description}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Encouragement */}
      {data.completionPercent < 100 && (
        <p className="text-xs text-center text-charcoal-muted pt-2">
          {totalCount - ownedCount} more {totalCount - ownedCount === 1 ? 'chapter' : 'chapters'} to complete your story ✨
        </p>
      )}
      {data.completionPercent === 100 && (
        <p className="text-xs text-center text-gold font-medium pt-2">
          🎉 Your collection is complete! Time for a new chapter?
        </p>
      )}
    </div>
  );
}

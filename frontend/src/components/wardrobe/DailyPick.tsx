import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Recommendation {
  item: string;
  brand: string;
  reason: string;
  pairingTip: string;
  generatedAt: string;
}

export default function DailyPick() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    api.get<{ recommendation: Recommendation | null; reason?: string }>('/recommendations/daily')
      .then((data) => {
        if (data.recommendation) {
          setRecommendation(data.recommendation);
        } else {
          setNoData(true);
        }
      })
      .catch(() => {
        setNoData(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="drape-card animate-pulse">
        <div className="h-4 bg-cream-300 rounded w-1/3 mb-3" />
        <div className="h-3 bg-cream-200 rounded w-full mb-2" />
        <div className="h-3 bg-cream-200 rounded w-2/3" />
      </div>
    );
  }

  if (noData || !recommendation) {
    return null;
  }

  return (
    <div className="drape-card border border-gold/30 bg-gradient-to-br from-cream-50 to-cream-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base" aria-hidden="true">✨</span>
        <h3 className="text-sm font-semibold text-charcoal">Today's Pick</h3>
        <span className="text-xs text-charcoal-muted ml-auto">Updated daily</span>
      </div>

      <p className="text-base font-medium text-charcoal mb-1">
        {recommendation.item}
      </p>
      <p className="text-sm text-charcoal-muted mb-3">
        from <span className="font-medium text-charcoal">{recommendation.brand}</span>
      </p>

      <p className="text-sm text-charcoal-muted mb-2">
        {recommendation.reason}
      </p>

      <div className="pt-2 border-t border-cream-300">
        <p className="text-xs text-charcoal-muted">
          <span className="font-medium">Style tip:</span> {recommendation.pairingTip}
        </p>
      </div>
    </div>
  );
}

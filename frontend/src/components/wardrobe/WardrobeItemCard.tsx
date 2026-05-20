import { useState } from 'react';
import type { WardrobeItem } from '@drape/shared';

interface WardrobeItemCardProps {
  item: WardrobeItem;
  onDelete: (id: string) => void;
}

/**
 * Map common color names to CSS-safe hex values for the color swatch.
 * Falls back to a neutral gray for unknown colors.
 */
const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  navy: '#1e3a5f',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  cream: '#f5f0e8',
  beige: '#d4c5a9',
  brown: '#92400e',
  tan: '#d2b48c',
  gray: '#6b7280',
  grey: '#6b7280',
  pink: '#ec4899',
  purple: '#a855f7',
  yellow: '#eab308',
  orange: '#f97316',
  gold: '#c9a96e',
  silver: '#c0c0c0',
  olive: '#6b8e23',
  burgundy: '#800020',
  maroon: '#800000',
  teal: '#14b8a6',
  coral: '#ff7f50',
  ivory: '#fffff0',
  charcoal: '#36454f',
  khaki: '#c3b091',
  lavender: '#e6e6fa',
  mint: '#98fb98',
  rust: '#b7410e',
  sage: '#9caf88',
  slate: '#708090',
  wine: '#722f37',
  denim: '#1560bd',
};

function getSwatchColor(color: string): string {
  const normalized = color.toLowerCase().trim();
  return COLOR_MAP[normalized] ?? '#9ca3af';
}

export default function WardrobeItemCard({ item, onDelete }: WardrobeItemCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showThumbnail = item.imageUrl && !imgError;

  return (
    <div className="drape-card flex flex-col gap-3 group" data-testid="wardrobe-item-card">
      {/* Thumbnail or shimmer placeholder */}
      {showThumbnail && (
        <div className="relative w-full h-40 rounded-card overflow-hidden bg-cream-50">
          {!imgLoaded && (
            <div
              className="absolute inset-0 animate-pulse bg-gradient-to-r from-cream-100 via-cream-200 to-cream-100"
              aria-label="Loading thumbnail"
            />
          )}
          <img
            src={item.imageUrl}
            alt={`${item.color} ${item.material} ${item.type}`}
            className={`w-full h-40 object-contain rounded-card transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded-full border border-cream-300 flex-shrink-0"
            style={{ backgroundColor: getSwatchColor(item.color) }}
            aria-label={`Color: ${item.color}`}
          />
          <span className="font-medium text-charcoal capitalize" data-testid="item-type">
            {item.type}
          </span>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-charcoal-muted hover:text-red-500 transition-opacity p-1 rounded"
          aria-label={`Delete ${item.type}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-charcoal-muted">
        <span data-testid="item-color">{item.color}</span>
        <span aria-hidden="true">·</span>
        <span data-testid="item-material">{item.material}</span>
      </div>
    </div>
  );
}

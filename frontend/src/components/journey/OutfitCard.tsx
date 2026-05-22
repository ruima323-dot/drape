import { useState } from 'react';
import type { JourneyEntry } from '@drape/shared';
import { resolveImageUrl } from '../../lib/imageUrl';

interface OutfitCardProps {
  outfit: JourneyEntry;
  onExpand?: (outfitId: string) => void;
  onDelete?: (id: string) => void;
}

// Keep legacy interface export for backward compatibility
export type SavedOutfitDisplay = JourneyEntry;

const contextBadge: Record<string, string> = {
  work: 'badge-work',
  casual: 'badge-casual',
  night_out: 'badge-night',
};

const contextLabel: Record<string, string> = {
  work: 'Work',
  casual: 'Casual',
  night_out: 'Night Out',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateNote(note: string, maxLength = 80): string {
  if (note.length <= maxLength) return note;
  return note.slice(0, maxLength).trimEnd() + '…';
}

export default function OutfitCard({ outfit, onExpand, onDelete }: OutfitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleToggle = () => {
    if (isConfirmingDelete) return;
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand && onExpand) {
      onExpand(outfit.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(outfit.id);
    setIsConfirmingDelete(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  const isPhoto = outfit.type === 'photo';

  // Determine thumbnail
  const thumbnailUrl = isPhoto
    ? resolveImageUrl(outfit.photoUrl)
    : resolveImageUrl(outfit.avatarImageUrl || outfit.imageUrl);

  // Show inline confirmation
  if (isConfirmingDelete) {
    return (
      <div
        className="drape-card flex flex-col items-center justify-center py-6 gap-3"
        data-testid="outfit-card-confirm-delete"
      >
        <p className="text-sm font-medium text-charcoal">Remove this outfit?</p>
        <div className="flex gap-3">
          <button
            onClick={handleCancelDelete}
            className="px-4 py-1.5 text-sm rounded-pill bg-cream-200 text-charcoal hover:bg-cream-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            className="px-4 py-1.5 text-sm rounded-pill bg-red-500 text-white hover:bg-red-600 transition-colors"
            data-testid="confirm-delete-btn"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="drape-card cursor-pointer transition-all duration-200 group relative"
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      aria-expanded={isExpanded}
      data-testid="outfit-card"
    >
      {/* Delete button — visible on hover */}
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-charcoal-muted hover:text-red-500 hover:bg-cream-200"
          aria-label="Delete outfit"
          data-testid="delete-outfit-btn"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Collapsed view */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-card bg-cream-200 overflow-hidden" data-testid="outfit-thumbnail">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={isPhoto ? 'Outfit photo thumbnail' : 'Outfit thumbnail'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cream-400">
              <svg
                className="w-8 h-8"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 28c0-5.523 3.582-10 8-10s8 4.477 8 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Occasion badge */}
            {outfit.occasionContext && (
              <span
                className={contextBadge[outfit.occasionContext] ?? 'badge-casual'}
                data-testid="occasion-badge"
              >
                {contextLabel[outfit.occasionContext] ?? outfit.occasionContext}
              </span>
            )}

            {/* Type indicator for photo entries */}
            {isPhoto && (
              <span className="text-xs text-charcoal-muted bg-cream-200 px-2 py-0.5 rounded-pill">
                📷 Worn
              </span>
            )}

            {!isPhoto && (
              <span className="text-xs text-charcoal-muted bg-cream-200 px-2 py-0.5 rounded-pill">
                ✨ Styled
              </span>
            )}

            {/* Accessory emojis (generated outfits only) */}
            {!isPhoto && outfit.accessories && outfit.accessories.length > 0 && (
              <span className="text-sm" aria-label="Accessories" data-testid="accessory-emojis">
                {outfit.accessories.map((a) => a.emoji).join(' ')}
              </span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-charcoal-muted mt-1" data-testid="outfit-date">
            {formatDate(outfit.date)}
          </p>

          {/* Note excerpt */}
          {outfit.note && (
            <p className="text-sm text-charcoal-muted mt-1 leading-snug" data-testid="outfit-note-excerpt">
              {isExpanded ? outfit.note : truncateNote(outfit.note)}
            </p>
          )}
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-charcoal-muted">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Expanded detail view */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-cream-300 space-y-4" data-testid="outfit-detail-expanded">
          {/* Full-size image */}
          {isPhoto && outfit.photoUrl && (
            <div className="rounded-card overflow-hidden bg-cream-100">
              <img
                src={resolveImageUrl(outfit.photoUrl)!}
                alt="Full outfit photo"
                className="w-full h-auto max-h-[400px] object-contain"
                data-testid="outfit-full-image"
              />
            </div>
          )}

          {!isPhoto && (outfit.imageUrl || outfit.avatarImageUrl) && (
            <div className="rounded-card overflow-hidden bg-cream-100">
              <img
                src={resolveImageUrl(outfit.imageUrl || outfit.avatarImageUrl)!}
                alt="Full outfit view"
                className="w-full h-auto max-h-[400px] object-contain"
                data-testid="outfit-full-image"
              />
            </div>
          )}

          {/* Wardrobe items */}
          {outfit.wardrobeItems && outfit.wardrobeItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-2">
                Clothing Items
              </h4>
              <div className="flex flex-wrap gap-2" data-testid="outfit-wardrobe-items">
                {outfit.wardrobeItems.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 bg-cream-100 text-charcoal text-xs px-2.5 py-1 rounded-pill"
                  >
                    {item.color} {item.material} {item.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Accessories (generated outfits only) */}
          {!isPhoto && outfit.accessories && outfit.accessories.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-2">
                Accessories
              </h4>
              <div className="flex flex-wrap gap-2" data-testid="outfit-accessories">
                {outfit.accessories.map((acc) => (
                  <span
                    key={acc.id}
                    className="inline-flex items-center gap-1 bg-cream-100 text-charcoal text-xs px-2.5 py-1 rounded-pill"
                  >
                    <span aria-hidden="true">{acc.emoji}</span>
                    {acc.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full note */}
          {outfit.note && (
            <div>
              <h4 className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-1">
                Note
              </h4>
              <p className="text-sm text-charcoal leading-relaxed" data-testid="outfit-full-note">
                {outfit.note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

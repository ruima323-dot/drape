import type { OccasionContext, AccessoryPlacement, Accessory } from '@drape/shared';

interface AvatarCardProps {
  occasionContext: OccasionContext;
  outfitImageUrl: string | null;
  baseAvatarUrl: string | null;
  isLoading: boolean;
  isLoadingBaseAvatar: boolean;
  activeAccessories: (AccessoryPlacement & { accessory: Accessory })[];
  onRemoveAccessory: (accessoryId: string) => void;
}

const contextLabel: Record<OccasionContext, string> = {
  work: 'Work',
  casual: 'Casual',
  night_out: 'Night Out',
};

const contextBg: Record<OccasionContext, string> = {
  work: 'bg-occasion-work-bg',
  casual: 'bg-occasion-casual-bg',
  night_out: 'bg-occasion-night-bg',
};

const contextBadge: Record<OccasionContext, string> = {
  work: 'badge-work',
  casual: 'badge-casual',
  night_out: 'badge-night',
};

const contextBorder: Record<OccasionContext, string> = {
  work: 'border-occasion-work-light',
  casual: 'border-occasion-casual-light',
  night_out: 'border-occasion-night-light',
};

export default function AvatarCard({
  occasionContext,
  outfitImageUrl,
  baseAvatarUrl,
  isLoading,
  isLoadingBaseAvatar,
  activeAccessories,
  onRemoveAccessory,
}: AvatarCardProps) {
  return (
    <div
      className={`relative rounded-card-lg overflow-hidden transition-colors duration-300 ${contextBg[occasionContext]} border-2 ${contextBorder[occasionContext]}`}
      data-testid="avatar-card"
    >
      {/* Occasion context overlay label */}
      <div className="absolute top-3 left-3 z-10">
        <span className={contextBadge[occasionContext]}>
          {contextLabel[occasionContext]}
        </span>
      </div>

      {/* Main image area */}
      <div className="relative flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-charcoal-muted">
            <svg
              className="animate-spin h-8 w-8"
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
            <span className="text-sm font-medium">Generating your look...</span>
          </div>
        ) : outfitImageUrl ? (
          <img
            src={outfitImageUrl}
            alt={`Generated ${contextLabel[occasionContext]} outfit`}
            className="w-full h-auto object-contain"
          />
        ) : isLoadingBaseAvatar ? (
          <div className="flex flex-col items-center gap-3 text-charcoal-muted py-12">
            <svg
              className="animate-spin h-8 w-8"
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
            <span className="text-sm font-medium">Creating your avatar...</span>
            <span className="text-xs text-charcoal-muted/60">This only happens once</span>
          </div>
        ) : baseAvatarUrl ? (
          <div className="relative">
            <img
              src={baseAvatarUrl}
              alt="Your base avatar"
              className="w-full h-auto object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="bg-white/80 backdrop-blur-sm text-charcoal text-sm font-medium px-4 py-2 rounded-pill shadow-card">
                Pick a context above to style your look
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 text-charcoal-muted">
            <svg
              className="w-32 h-48 text-cream-400"
              viewBox="0 0 128 192"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Head */}
              <circle cx="64" cy="36" r="18" stroke="currentColor" strokeWidth="2.5" />
              {/* Neck */}
              <path d="M58 54V62H70V54" stroke="currentColor" strokeWidth="2" />
              {/* Body/torso */}
              <path d="M40 62H88L92 130H36L40 62Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
              {/* Arms */}
              <path d="M40 62L24 100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M88 62L104 100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Legs */}
              <path d="M50 130V172" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M78 130V172" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Feet */}
              <path d="M44 172H56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M72 172H84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm">Pick a context to dress your avatar</p>
          </div>
        )}
      </div>

      {/* Accessory badges overlay */}
      {activeAccessories.length > 0 && (
        <div
          className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2"
          aria-label="Active accessories"
        >
          {activeAccessories.map(({ accessoryId, accessory }) => (
            <span
              key={accessoryId}
              className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-charcoal text-xs font-medium px-2.5 py-1 rounded-pill shadow-card"
            >
              <span aria-hidden="true">{accessory.emoji}</span>
              <span>{accessory.label}</span>
              <button
                onClick={() => onRemoveAccessory(accessoryId)}
                className="ml-0.5 text-charcoal-muted hover:text-red-500 transition-colors"
                aria-label={`Remove ${accessory.label}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

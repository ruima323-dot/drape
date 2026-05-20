interface PhotoPreviewProps {
  photoUrl: string | null;
  isAnalyzing: boolean;
}

export default function PhotoPreview({ photoUrl, isAnalyzing }: PhotoPreviewProps) {
  if (!photoUrl) return null;

  return (
    <div className="relative rounded-card-lg overflow-hidden bg-cream-100">
      <img
        src={photoUrl}
        alt="Uploaded outfit photo"
        className="w-full h-auto max-h-[400px] object-contain"
      />

      {/* Loading spinner overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-gold"
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
            <span className="text-sm font-medium text-charcoal">
              Analyzing your outfit…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

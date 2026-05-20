import { useNavigate } from 'react-router-dom';

export default function JourneyEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="journey-empty-state">
      {/* Timeline illustration */}
      <svg
        className="w-24 h-24 text-cream-400 mb-6"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Timeline line */}
        <line x1="48" y1="12" x2="48" y2="84" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        {/* Top circle */}
        <circle cx="48" cy="24" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="24" r="3" fill="currentColor" opacity="0.3" />
        {/* Middle circle */}
        <circle cx="48" cy="48" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="48" r="3" fill="currentColor" opacity="0.3" />
        {/* Bottom circle */}
        <circle cx="48" cy="72" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="72" r="3" fill="currentColor" opacity="0.3" />
        {/* Side lines */}
        <line x1="56" y1="24" x2="72" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <line x1="24" y1="48" x2="40" y2="48" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <line x1="56" y1="72" x2="72" y2="72" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>

      <h3 className="text-xl font-display font-semibold text-charcoal mb-2">
        Your style journey starts here
      </h3>
      <p className="text-charcoal-muted max-w-md mb-6">
        Save outfits from Today's Look to build your personal style timeline.
        Watch your aesthetic evolve month by month.
      </p>

      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal text-white text-sm font-medium rounded-card hover:bg-charcoal-light transition-colors active:scale-[0.98]"
        data-testid="journey-cta-button"
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
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        Create Your First Look
      </button>
    </div>
  );
}

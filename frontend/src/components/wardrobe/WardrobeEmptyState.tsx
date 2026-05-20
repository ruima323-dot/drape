export default function WardrobeEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Hanger illustration */}
      <svg
        className="w-24 h-24 text-cream-400 mb-6"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="48" cy="20" r="6" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M48 26V32L16 56H80L48 32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 56V60C16 62.2091 17.7909 64 20 64H76C78.2091 64 80 62.2091 80 60V56"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M32 72H64"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M40 78H56"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>

      <h3 className="text-xl font-display font-semibold text-charcoal mb-2">
        Your wardrobe is empty
      </h3>
      <p className="text-charcoal-muted max-w-md">
        Describe your clothes in the text box above to start building your wardrobe.
        Try something like{' '}
        <span className="text-charcoal italic">
          "navy slim-fit cotton shirt, black relaxed linen pants"
        </span>
      </p>
    </div>
  );
}

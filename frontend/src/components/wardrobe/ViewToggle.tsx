interface ViewToggleProps {
  activeView: 'category' | 'color';
  onViewChange: (view: 'category' | 'color') => void;
}

const views: { value: 'category' | 'color'; label: string }[] = [
  { value: 'category', label: 'By Category' },
  { value: 'color', label: 'By Color' },
];

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 bg-cream-200 rounded-pill"
      role="radiogroup"
      aria-label="Wardrobe view mode"
    >
      {views.map(({ value, label }) => {
        const isActive = activeView === value;

        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onViewChange(value)}
            className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors cursor-pointer ${
              isActive
                ? 'bg-charcoal text-cream-50'
                : 'text-charcoal-muted hover:bg-cream-300'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

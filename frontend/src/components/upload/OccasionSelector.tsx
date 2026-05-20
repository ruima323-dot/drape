import type { OccasionContext } from '@drape/shared';

interface OccasionSelectorProps {
  selected: OccasionContext | null;
  onSelect: (context: OccasionContext) => void;
}

const occasions: { value: OccasionContext; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'casual', label: 'Casual' },
  { value: 'night_out', label: 'Night Out' },
];

const occasionStyles: Record<OccasionContext, { active: string; inactive: string }> = {
  work: {
    active: 'bg-occasion-work text-white border-occasion-work',
    inactive: 'text-occasion-work hover:bg-occasion-work-bg border-cream-300',
  },
  casual: {
    active: 'bg-occasion-casual text-white border-occasion-casual',
    inactive: 'text-occasion-casual hover:bg-occasion-casual-bg border-cream-300',
  },
  night_out: {
    active: 'bg-occasion-night text-white border-occasion-night',
    inactive: 'text-occasion-night hover:bg-occasion-night-bg border-cream-300',
  },
};

export default function OccasionSelector({ selected, onSelect }: OccasionSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-charcoal">Occasion</h3>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Select occasion context"
      >
        {occasions.map(({ value, label }) => {
          const isActive = selected === value;
          const styles = occasionStyles[value];

          return (
            <button
              key={value}
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(value)}
              className={`px-4 py-2 rounded-pill text-sm font-medium border transition-colors ${
                isActive ? styles.active : styles.inactive
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

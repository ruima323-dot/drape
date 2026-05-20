import type { OccasionContext } from '@drape/shared';

interface ContextToggleProps {
  activeContext: OccasionContext;
  onContextChange: (context: OccasionContext) => void;
  disabled?: boolean;
}

const contexts: { value: OccasionContext; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'casual', label: 'Casual' },
  { value: 'night_out', label: 'Night Out' },
];

const contextStyles: Record<OccasionContext, { active: string; inactive: string }> = {
  work: {
    active: 'bg-occasion-work text-white',
    inactive: 'text-occasion-work hover:bg-occasion-work-bg',
  },
  casual: {
    active: 'bg-occasion-casual text-white',
    inactive: 'text-occasion-casual hover:bg-occasion-casual-bg',
  },
  night_out: {
    active: 'bg-occasion-night text-white',
    inactive: 'text-occasion-night hover:bg-occasion-night-bg',
  },
};

export default function ContextToggle({
  activeContext,
  onContextChange,
  disabled = false,
}: ContextToggleProps) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 bg-cream-200 rounded-pill"
      role="radiogroup"
      aria-label="Occasion context"
    >
      {contexts.map(({ value, label }) => {
        const isActive = activeContext === value;
        const styles = contextStyles[value];

        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onContextChange(value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-pill text-sm font-medium transition-colors ${
              isActive ? styles.active : styles.inactive
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

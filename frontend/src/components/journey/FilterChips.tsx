import type { OccasionContext } from '@drape/shared';

export type FilterValue = OccasionContext | 'all';

interface FilterChipsProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

const filters: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'work', label: 'Work' },
  { value: 'casual', label: 'Casual' },
  { value: 'night_out', label: 'Night Out' },
];

const filterStyles: Record<FilterValue, { active: string; inactive: string }> = {
  all: {
    active: 'bg-charcoal text-white',
    inactive: 'text-charcoal hover:bg-cream-200',
  },
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

export default function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Filter outfits by occasion"
    >
      {filters.map(({ value, label }) => {
        const isActive = activeFilter === value;
        const styles = filterStyles[value];

        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onFilterChange(value)}
            className={`px-4 py-1.5 rounded-pill text-sm font-medium transition-colors border ${
              isActive
                ? `${styles.active} border-transparent`
                : `${styles.inactive} border-cream-300`
            }`}
            data-testid={`filter-chip-${value}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

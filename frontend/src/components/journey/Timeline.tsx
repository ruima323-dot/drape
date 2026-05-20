import OutfitCard from './OutfitCard';
import type { JourneyEntry } from '@drape/shared';

export interface MonthGroup {
  month: number;
  year: number;
  label: string;
  entries: JourneyEntry[];
}

interface TimelineProps {
  groups: MonthGroup[];
  onExpandOutfit?: (outfitId: string) => void;
  onDeleteEntry?: (id: string) => void;
}

export default function Timeline({ groups, onExpandOutfit, onDeleteEntry }: TimelineProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8" data-testid="timeline">
      {groups.map((group) => (
        <section
          key={`${group.year}-${group.month}`}
          aria-label={group.label}
        >
          {/* Month/year header */}
          <div className="flex items-center gap-3 mb-4">
            <h2
              className="text-lg font-display font-semibold text-charcoal whitespace-nowrap"
              data-testid="month-header"
            >
              {group.label}
            </h2>
            <div className="flex-1 h-px bg-cream-300" aria-hidden="true" />
            <span className="text-xs text-charcoal-muted">
              {group.entries.length} {group.entries.length === 1 ? 'outfit' : 'outfits'}
            </span>
          </div>

          {/* Outfit cards for this month */}
          <div className="space-y-3">
            {group.entries.map((entry) => (
              <OutfitCard
                key={entry.id}
                outfit={entry}
                onExpand={onExpandOutfit}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

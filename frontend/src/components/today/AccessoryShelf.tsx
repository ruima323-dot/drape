import type { Accessory } from '@drape/shared';

interface AccessoryShelfProps {
  accessories: Accessory[];
  activeAccessoryIds: Set<string>;
  onToggle: (accessoryId: string) => void;
  disabled?: boolean;
}

export default function AccessoryShelf({
  accessories,
  activeAccessoryIds,
  onToggle,
  disabled = false,
}: AccessoryShelfProps) {
  if (accessories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-charcoal-muted">
        Accessory Shelf
      </h3>
      <div
        className="flex flex-wrap gap-2"
        role="list"
        aria-label="Saved accessories"
      >
        {accessories.map((accessory) => {
          const isActive = activeAccessoryIds.has(accessory.id);

          return (
            <button
              key={accessory.id}
              role="listitem"
              onClick={() => onToggle(accessory.id)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-pill border transition-all ${
                isActive
                  ? 'bg-gold/10 border-gold text-charcoal font-medium shadow-sm'
                  : 'bg-white border-cream-300 text-charcoal-muted hover:border-cream-400 hover:bg-cream-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-pressed={isActive}
              aria-label={`${accessory.label}${isActive ? ' (active)' : ''}`}
            >
              <span aria-hidden="true">{accessory.emoji}</span>
              <span>{accessory.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

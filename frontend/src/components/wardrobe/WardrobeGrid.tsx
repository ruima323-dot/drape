import type { WardrobeItem } from '@drape/shared';
import WardrobeItemCard from './WardrobeItemCard';

interface WardrobeGridProps {
  items: WardrobeItem[];
  onDelete: (id: string) => void;
}

export default function WardrobeGrid({ items, onDelete }: WardrobeGridProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="list"
      aria-label="Wardrobe items"
    >
      {items.map((item) => (
        <div key={item.id} role="listitem">
          <WardrobeItemCard item={item} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

import type { IdentifiedItem } from '@drape/shared';
import IdentifiedItemCard from './IdentifiedItemCard';

interface IdentifiedItemListProps {
  items: IdentifiedItem[];
  newItemIndices: Set<number>;
  onItemsChange: (items: IdentifiedItem[]) => void;
  onRemoveItem: (index: number) => void;
}

export default function IdentifiedItemList({
  items,
  newItemIndices,
  onItemsChange,
  onRemoveItem,
}: IdentifiedItemListProps) {
  if (items.length === 0) return null;

  const newCount = Array.from(newItemIndices).filter((i) => i < items.length).length;

  const handleEdit = (index: number, updatedItem: IdentifiedItem) => {
    const updated = [...items];
    updated[index] = updatedItem;
    onItemsChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Count header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-charcoal">
          Identified Items ({items.length})
        </h3>
        {newCount > 0 && (
          <span className="text-xs text-gold font-medium">
            {newCount} new {newCount === 1 ? 'item' : 'items'} will be added to your wardrobe
          </span>
        )}
      </div>

      {/* Item cards */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <IdentifiedItemCard
            key={`${item.type}-${item.color}-${item.material}-${index}`}
            item={item}
            isNew={newItemIndices.has(index)}
            onEdit={(updated) => handleEdit(index, updated)}
            onRemove={() => onRemoveItem(index)}
          />
        ))}
      </div>
    </div>
  );
}

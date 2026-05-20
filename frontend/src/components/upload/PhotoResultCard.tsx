import type { IdentifiedItem, OccasionContext } from '@drape/shared';
import IdentifiedItemList from './IdentifiedItemList';
import OccasionSelector from './OccasionSelector';
import NoteInput from './NoteInput';

interface PhotoResultCardProps {
  photoUrl: string;
  items: IdentifiedItem[];
  newItemIndices: Set<number>;
  occasion: OccasionContext | null;
  note: string;
  onItemsChange: (items: IdentifiedItem[]) => void;
  onRemoveItem: (index: number) => void;
  onOccasionChange: (occasion: OccasionContext) => void;
  onNoteChange: (note: string) => void;
  onRemovePhoto: () => void;
}

export default function PhotoResultCard({
  photoUrl,
  items,
  newItemIndices,
  occasion,
  note,
  onItemsChange,
  onRemoveItem,
  onOccasionChange,
  onNoteChange,
  onRemovePhoto,
}: PhotoResultCardProps) {
  return (
    <div className="drape-card relative space-y-4">
      {/* Remove photo button */}
      <button
        onClick={onRemovePhoto}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-charcoal/70 text-white hover:bg-red-500 transition-colors"
        aria-label="Remove this photo from batch"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Photo thumbnail */}
      <div className="rounded-card overflow-hidden bg-cream-100">
        <img
          src={photoUrl}
          alt="Uploaded outfit photo"
          className="w-full h-48 object-cover"
        />
      </div>

      {/* Identified items */}
      <IdentifiedItemList
        items={items}
        newItemIndices={newItemIndices}
        onItemsChange={onItemsChange}
        onRemoveItem={onRemoveItem}
      />

      {/* Per-photo occasion selector */}
      <OccasionSelector selected={occasion} onSelect={onOccasionChange} />

      {/* Per-photo note */}
      <NoteInput value={note} onChange={onNoteChange} />
    </div>
  );
}

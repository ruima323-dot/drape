import { useState } from 'react';
import type { IdentifiedItem } from '@drape/shared';

interface IdentifiedItemCardProps {
  item: IdentifiedItem;
  isNew: boolean;
  onEdit: (item: IdentifiedItem) => void;
  onRemove: () => void;
}

export default function IdentifiedItemCard({
  item,
  isNew,
  onEdit,
  onRemove,
}: IdentifiedItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState(item.type);
  const [editColor, setEditColor] = useState(item.color);
  const [editMaterial, setEditMaterial] = useState(item.material);

  const handleSaveEdit = () => {
    onEdit({ type: editType, color: editColor, material: editMaterial });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditType(item.type);
    setEditColor(item.color);
    setEditMaterial(item.material);
    setIsEditing(false);
  };

  return (
    <div className="drape-card flex items-start gap-3" data-testid="identified-item-card">
      {/* Badge */}
      <span
        className={`flex-shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-pill ${
          isNew
            ? 'bg-gold text-white'
            : 'bg-cream-300 text-charcoal-muted'
        }`}
        data-testid="item-badge"
      >
        {isNew ? 'New' : 'Existing'}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="px-2 py-1 text-sm border border-cream-400 rounded-card bg-white focus:outline-none focus:border-gold"
                placeholder="Type"
                aria-label="Item type"
              />
              <input
                type="text"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="px-2 py-1 text-sm border border-cream-400 rounded-card bg-white focus:outline-none focus:border-gold"
                placeholder="Color"
                aria-label="Item color"
              />
              <input
                type="text"
                value={editMaterial}
                onChange={(e) => setEditMaterial(e.target.value)}
                className="px-2 py-1 text-sm border border-cream-400 rounded-card bg-white focus:outline-none focus:border-gold"
                placeholder="Material"
                aria-label="Item material"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="text-xs text-gold hover:text-gold-muted font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs text-charcoal-muted hover:text-charcoal"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-charcoal">
            <span className="font-medium">{item.type}</span>
            {' · '}
            <span className="text-charcoal-muted">{item.color}</span>
            {' · '}
            <span className="text-charcoal-muted">{item.material}</span>
          </p>
        )}
      </div>

      {/* Action buttons */}
      {!isEditing && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-charcoal-muted hover:text-charcoal transition-colors"
            aria-label="Edit item"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-charcoal-muted hover:text-red-500 transition-colors"
            aria-label="Remove item"
          >
            <svg
              className="w-4 h-4"
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
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { IdentifiedItem, OccasionContext } from '@drape/shared';

export interface PhotoSaveData {
  photoUrl: string;
  items: IdentifiedItem[];
  photoDate: string | null;
  occasionContext: OccasionContext | null;
  note: string;
}

interface SavePhotoButtonProps {
  disabled: boolean;
  photos: PhotoSaveData[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function SavePhotoButton({
  disabled,
  photos,
  onSaved,
  onCancel,
}: SavePhotoButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Can only save if all photos have an occasion selected and at least one item
  const canSave =
    !disabled &&
    photos.length > 0 &&
    photos.every((p) => p.photoUrl && p.items.length > 0 && p.occasionContext !== null);

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setSaveProgress({ current: 0, total: photos.length });

    let totalNewItems = 0;
    let savedCount = 0;

    try {
      const { data: sessionData } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      for (let i = 0; i < photos.length; i++) {
        setSaveProgress({ current: i + 1, total: photos.length });
        const photo = photos[i];

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
        const response = await fetch(`${apiBaseUrl}/photos/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            photoUrl: photo.photoUrl,
            items: photo.items,
            occasionContext: photo.occasionContext,
            note: photo.note || undefined,
            takenAt: photo.photoDate || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save photo ${i + 1}`);
        }

        const data = await response.json();
        totalNewItems += data.newItemCount ?? 0;
        savedCount++;
      }

      const outfitWord = savedCount === 1 ? 'outfit' : 'outfits';
      const toastMessage =
        totalNewItems > 0
          ? `${savedCount} ${outfitWord} saved! ${totalNewItems} new ${totalNewItems === 1 ? 'item' : 'items'} added to your wardrobe.`
          : `${savedCount} ${outfitWord} saved to your journey!`;

      setToast(toastMessage);
      setTimeout(() => setToast(null), 3000);

      onSaved();
    } catch {
      setToast('Failed to save. Please try again.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  const savingLabel = saveProgress
    ? `Saving ${saveProgress.current} of ${saveProgress.total}…`
    : 'Saving…';

  return (
    <div className="relative">
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-3 rounded-pill text-sm font-medium border border-cream-400 text-charcoal-muted hover:text-charcoal hover:border-charcoal transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className={`flex-[2] py-3 rounded-pill text-sm font-medium transition-colors ${
            canSave && !isSaving
              ? 'bg-gold text-white hover:bg-gold-muted'
              : 'bg-cream-300 text-charcoal-muted cursor-not-allowed'
          }`}
        >
          {isSaving ? savingLabel : 'Save to Outfit Journey'}
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2 animate-fade-in-up">
          <div className="bg-charcoal text-white text-xs px-4 py-2 rounded-pill whitespace-nowrap shadow-card-elevated">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

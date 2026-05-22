import { useState, useCallback } from 'react';
import exifr from 'exifr';
import type { IdentifiedItem, OccasionContext } from '@drape/shared';
import { resolveImageUrl } from '../lib/imageUrl';
import PhotoUploadArea from '../components/upload/PhotoUploadArea';
import PhotoResultCard from '../components/upload/PhotoResultCard';
import SavePhotoButton from '../components/upload/SavePhotoButton';

interface PhotoEntry {
  id: string;
  file: File;
  photoUrl: string | null;
  items: IdentifiedItem[];
  newItemIndices: Set<number>;
  isAnalyzing: boolean;
  error: string | null;
  photoDate: string | null;
  occasion: OccasionContext | null;
  note: string;
}

export default function TodaysLook() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null);

  const isAnyAnalyzing = photos.some((p) => p.isAnalyzing);
  const hasResults = photos.length > 0 && photos.some((p) => !p.isAnalyzing && p.items.length > 0);

  const resetPage = () => {
    for (const photo of photos) {
      if (photo.photoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.photoUrl);
      }
    }
    setPhotos([]);
    setAnalyzeProgress(null);
  };

  const analyzePhoto = async (entry: PhotoEntry): Promise<PhotoEntry> => {
    const localPreview = URL.createObjectURL(entry.file);

    // Extract EXIF date
    let photoDate: string | null = null;
    try {
      const exif = await exifr.parse(entry.file, ['DateTimeOriginal', 'CreateDate']);
      const takenDate = exif?.DateTimeOriginal ?? exif?.CreateDate;
      if (takenDate instanceof Date) {
        photoDate = takenDate.toISOString();
      }
    } catch {
      // No EXIF data — will use upload date
    }

    try {
      const formData = new FormData();
      formData.append('photo', entry.file);

      const { data: sessionData } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
      const response = await fetch(`${apiBaseUrl}/photos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const data = await response.json();

      // Revoke local preview and use server URL
      URL.revokeObjectURL(localPreview);

      if (!data.items || data.items.length === 0) {
        return {
          ...entry,
          photoUrl: resolveImageUrl(data.photoUrl),
          items: [],
          newItemIndices: new Set(),
          isAnalyzing: false,
          error: 'No clothing items detected.',
          photoDate,
        };
      }

      return {
        ...entry,
        photoUrl: resolveImageUrl(data.photoUrl),
        items: data.items,
        newItemIndices: new Set(data.items.map((_: IdentifiedItem, i: number) => i)),
        isAnalyzing: false,
        error: null,
        photoDate,
      };
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      return {
        ...entry,
        photoUrl: null,
        items: [],
        newItemIndices: new Set(),
        isAnalyzing: false,
        error: err instanceof Error ? err.message : 'Failed to analyze photo.',
        photoDate,
      };
    }
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Create initial entries
    const newEntries: PhotoEntry[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      photoUrl: URL.createObjectURL(file),
      items: [],
      newItemIndices: new Set<number>(),
      isAnalyzing: true,
      error: null,
      photoDate: null,
      occasion: null,
      note: '',
    }));

    setPhotos((prev) => [...prev, ...newEntries]);
    setAnalyzeProgress({ current: 0, total: files.length });

    // Analyze all photos in parallel
    const results = await Promise.all(
      newEntries.map(async (entry, index) => {
        const result = await analyzePhoto(entry);
        setAnalyzeProgress((prev) =>
          prev ? { ...prev, current: Math.min(prev.current + 1, prev.total) } : null,
        );
        // Update individual photo as it completes
        setPhotos((prev) =>
          prev.map((p) => (p.id === entry.id ? result : p)),
        );
        return { index, result };
      }),
    );

    // Clear progress after all complete
    setAnalyzeProgress(null);

    // If all failed, we still keep them so user can see errors
    void results;
  }, []);

  const handleItemsChange = (photoId: string, items: IdentifiedItem[]) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, items } : p)),
    );
  };

  const handleRemoveItem = (photoId: string, index: number) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        const newItems = p.items.filter((_, i) => i !== index);
        const newIndices = new Set<number>();
        for (const idx of p.newItemIndices) {
          if (idx < index) newIndices.add(idx);
          else if (idx > index) newIndices.add(idx - 1);
        }
        return { ...p, items: newItems, newItemIndices: newIndices };
      }),
    );
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo?.photoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photo.photoUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const handleSaved = () => {
    resetPage();
  };

  // Build save data from successful photos
  const savablePhotos = photos.filter(
    (p) => !p.isAnalyzing && !p.error && p.photoUrl && p.items.length > 0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 text-center py-6">
        <h1 className="text-4xl font-display font-semibold text-charcoal">
          Today's Look
        </h1>
        {photos.length === 0 && (
          <p className="text-charcoal-muted text-base max-w-md mx-auto leading-relaxed">
            What are you wearing today? Snap a photo and we'll keep track for you. Your style story builds one outfit at a time.
          </p>
        )}
      </div>

      {/* Upload area - shown when no photos yet or to add more */}
      {!isAnyAnalyzing && (
        <PhotoUploadArea
          onFilesSelected={handleFilesSelected}
          disabled={isAnyAnalyzing}
        />
      )}

      {/* Analyzing progress */}
      {isAnyAnalyzing && analyzeProgress && (
        <div className="drape-card text-center py-6">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-gold"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium text-charcoal">
              {analyzeProgress.total === 1
                ? 'Analyzing your outfit…'
                : `Analyzing ${analyzeProgress.current} of ${analyzeProgress.total}…`}
            </span>
          </div>
        </div>
      )}

      {/* Error-only photos */}
      {photos
        .filter((p) => !p.isAnalyzing && p.error)
        .map((photo) => (
          <div key={photo.id} className="drape-card text-center py-4">
            <p className="text-sm text-red-600 mb-2">{photo.error}</p>
            <button
              onClick={() => handleRemovePhoto(photo.id)}
              className="text-sm text-gold hover:text-gold-muted underline"
            >
              Remove
            </button>
          </div>
        ))}

      {/* Photo result cards */}
      {hasResults && (
        <div className="space-y-4">
          {savablePhotos.map((photo) => (
            <PhotoResultCard
              key={photo.id}
              photoUrl={photo.photoUrl!}
              items={photo.items}
              newItemIndices={photo.newItemIndices}
              occasion={photo.occasion}
              note={photo.note}
              onItemsChange={(items) => handleItemsChange(photo.id, items)}
              onRemoveItem={(index) => handleRemoveItem(photo.id, index)}
              onOccasionChange={(occ) => setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, occasion: occ } : p))}
              onNoteChange={(n) => setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, note: n } : p))}
              onRemovePhoto={() => handleRemovePhoto(photo.id)}
            />
          ))}

          {/* Save button */}
          <SavePhotoButton
            disabled={isAnyAnalyzing}
            photos={savablePhotos.map((p) => ({
              photoUrl: p.photoUrl!,
              items: p.items,
              photoDate: p.photoDate,
              occasionContext: p.occasion,
              note: p.note,
            }))}
            onSaved={handleSaved}
            onCancel={resetPage}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type { SavedOutfit } from '@drape/shared';

const MAX_NOTE_LENGTH = 280;

interface SaveButtonProps {
  /** The ID of the generated outfit to save */
  generatedOutfitId: string | null;
  /** Whether the outfit has been modified since last save (resets saved state) */
  outfitModified: boolean;
  /** Callback after a successful save */
  onSaved?: (savedOutfit: SavedOutfit) => void;
  /** Disable the button (e.g. while generating) */
  disabled?: boolean;
}

export default function SaveButton({
  generatedOutfitId,
  outfitModified,
  onSaved,
  disabled = false,
}: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Reset saved state when outfit is modified
  useEffect(() => {
    if (outfitModified) {
      setIsSaved(false);
    }
  }, [outfitModified]);

  const noteOverLimit = note.length > MAX_NOTE_LENGTH;

  const handleButtonClick = () => {
    if (isSaved || !generatedOutfitId) return;
    setNote('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleConfirmSave = useCallback(async () => {
    if (!generatedOutfitId || noteOverLimit) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await api.post<SavedOutfit>('/outfits/save', {
        generatedOutfitId,
        note: note.trim() || undefined,
      });

      setIsSaved(true);
      setIsModalOpen(false);
      setNote('');

      // Show toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      onSaved?.(result);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save outfit. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [generatedOutfitId, note, noteOverLimit, onSaved]);

  const handleCloseModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
      setNote('');
      setSaveError(null);
    }
  };

  return (
    <>
      {/* Save button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || !generatedOutfitId || isSaved}
        className={`
          inline-flex items-center gap-2 px-4 py-2.5 rounded-card text-sm font-medium
          transition-all duration-200
          ${
            isSaved
              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
              : disabled || !generatedOutfitId
                ? 'bg-cream-200 text-charcoal-muted cursor-not-allowed'
                : 'bg-white text-charcoal border border-cream-300 hover:border-gold hover:shadow-card-hover active:scale-[0.98]'
          }
        `}
        aria-label={isSaved ? 'Outfit saved' : 'Save outfit'}
        data-testid="save-button"
      >
        {isSaved ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-green-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>✓ Saved</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
            <span>Save Outfit</span>
          </>
        )}
      </button>

      {/* Note modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={handleCloseModal}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-card-lg shadow-card-elevated w-full max-w-md p-card-lg">
            <h2
              id="save-modal-title"
              className="text-lg font-display font-semibold text-charcoal mb-1"
            >
              Save This Look
            </h2>
            <p className="text-sm text-charcoal-muted mb-4">
              Add an optional note about this outfit — where you wore it, how it felt.
            </p>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Wore this to the gallery opening — felt effortlessly chic"
                className={`
                  w-full h-28 px-3 py-2.5 text-sm text-charcoal bg-cream-50 border rounded-card
                  resize-none focus:outline-none focus:ring-2 transition-colors
                  ${
                    noteOverLimit
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-cream-300 focus:ring-gold/30 focus:border-gold'
                  }
                `}
                maxLength={MAX_NOTE_LENGTH + 50}
                disabled={isSaving}
                autoFocus
                data-testid="save-note-input"
              />

              {/* Character counter */}
              <div
                className={`
                  absolute bottom-2 right-3 text-xs font-medium
                  ${noteOverLimit ? 'text-red-500' : note.length > MAX_NOTE_LENGTH * 0.9 ? 'text-gold-muted' : 'text-charcoal-muted'}
                `}
                data-testid="char-counter"
              >
                {note.length}/{MAX_NOTE_LENGTH}
              </div>
            </div>

            {/* Over-limit warning */}
            {noteOverLimit && (
              <p className="text-xs text-red-500 mt-1" role="alert">
                Note exceeds the {MAX_NOTE_LENGTH} character limit.
              </p>
            )}

            {/* Error message */}
            {saveError && (
              <p className="text-xs text-red-500 mt-2" role="alert">
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal transition-colors rounded-card"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving || noteOverLimit}
                className={`
                  px-4 py-2 text-sm font-medium rounded-card transition-all duration-200
                  ${
                    isSaving || noteOverLimit
                      ? 'bg-cream-300 text-charcoal-muted cursor-not-allowed'
                      : 'bg-charcoal text-white hover:bg-charcoal-light active:scale-[0.98]'
                  }
                `}
                data-testid="save-confirm-button"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin h-3.5 w-3.5"
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
                    Saving…
                  </span>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
          role="status"
          aria-live="polite"
          data-testid="save-toast"
        >
          <div className="inline-flex items-center gap-2 bg-charcoal text-white text-sm font-medium px-4 py-2.5 rounded-pill shadow-card-elevated">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Outfit saved to your journey
          </div>
        </div>
      )}
    </>
  );
}

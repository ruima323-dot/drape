import { useState, useCallback } from 'react';
import type { Accessory, ParseResult } from '@drape/shared';
import { api } from '../../lib/api';

interface AccessoryPromptInputProps {
  outfitId: string | null;
  onAccessoryAdded: (accessory: Accessory) => void;
  disabled?: boolean;
}

export default function AccessoryPromptInput({
  outfitId,
  onAccessoryAdded,
  disabled = false,
}: AccessoryPromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = prompt.trim();
      if (!trimmed || !outfitId) return;

      setIsSubmitting(true);
      setError(null);

      try {
        // Step 1: Parse the accessory prompt
        const parseResult = await api.post<ParseResult<Accessory>>(
          '/accessories/parse',
          { text: trimmed },
        );

        if (!parseResult.success || !parseResult.data) {
          const errorMsg =
            parseResult.errors?.[0]?.message ??
            'Could not interpret that as an accessory. Try something like "gold hoop earrings".';
          setError(errorMsg);
          return;
        }

        const parsed = parseResult.data;

        // Step 2: Save the accessory to the shelf
        const savedAccessory = await api.post<{ accessory: Accessory }>(
          '/accessories',
          {
            type: parsed.type,
            color: parsed.color,
            material: parsed.material,
            label: parsed.label ?? `${parsed.color} ${parsed.material} ${parsed.type}`.trim(),
            emoji: parsed.emoji ?? '💎',
          },
        );

        const accessory = savedAccessory.accessory ?? savedAccessory;

        // Step 3: Composite the accessory onto the outfit
        await api.post('/accessories/composite', {
          outfitId,
          accessoryId: (accessory as Accessory).id,
          action: 'add',
        });

        // Notify parent
        onAccessoryAdded(accessory as Accessory);
        setPrompt('');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [prompt, outfitId, onAccessoryAdded],
  );

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (error) setError(null);
          }}
          placeholder='Add an accessory, e.g. "gold hoop earrings"'
          disabled={disabled || isSubmitting || !outfitId}
          className="flex-1 px-4 py-2.5 text-sm bg-white border border-cream-300 rounded-pill placeholder:text-charcoal-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Accessory prompt"
        />
        <button
          type="submit"
          disabled={disabled || isSubmitting || !prompt.trim() || !outfitId}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gold rounded-pill hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add accessory"
        >
          {isSubmitting ? (
            <svg
              className="animate-spin h-4 w-4"
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
          ) : (
            'Add'
          )}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 px-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

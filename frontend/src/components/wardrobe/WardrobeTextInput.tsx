import { useState } from 'react';
import type { ParseError, WardrobeItem } from '@drape/shared';
import { api } from '../../lib/api';

interface WardrobeTextInputProps {
  onItemsAdded: (items: WardrobeItem[]) => void;
}

interface ParseResponse {
  success: boolean;
  data?: WardrobeItem[];
  errors?: ParseError[];
}

export default function WardrobeTextInput({ onItemsAdded }: WardrobeTextInputProps) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors([]);
    setSubmitError(null);

    try {
      const parseResult = await api.post<ParseResponse>('/wardrobe/parse', { text });

      if (!parseResult.success || !parseResult.data?.length) {
        setErrors(parseResult.errors ?? []);
        return;
      }

      const storedResult = await api.post<{ items: WardrobeItem[] }>('/wardrobe/items', {
        items: parseResult.data,
      });

      onItemsAdded(storedResult.items ?? []);
      setText('');
      setErrors([]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderHighlightedText = () => {
    if (errors.length === 0) return null;

    const sorted = [...errors].sort((a, b) => a.position.start - b.position.start);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((error, i) => {
      if (error.position.start > lastIndex) {
        parts.push(
          <span key={`ok-${i}`}>{text.slice(lastIndex, error.position.start)}</span>
        );
      }
      parts.push(
        <span
          key={`err-${i}`}
          className="bg-red-100 text-red-700 underline decoration-wavy decoration-red-400 rounded px-0.5"
          title={error.message}
        >
          {text.slice(error.position.start, error.position.end)}
        </span>
      );
      lastIndex = error.position.end;
    });

    if (lastIndex < text.length) {
      parts.push(<span key="tail">{text.slice(lastIndex)}</span>);
    }

    return (
      <div
        className="mt-2 p-3 bg-cream-50 border border-red-200 rounded-card text-sm whitespace-pre-wrap font-sans text-charcoal"
        role="alert"
        aria-label="Parse errors highlighted in text"
      >
        {parts}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <label htmlFor="wardrobe-text" className="block text-sm font-medium text-charcoal">
        Describe your clothes
      </label>
      <textarea
        id="wardrobe-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe your clothes: navy slim-fit cotton shirt, black relaxed linen pants, cream silk blouse for work..."
        rows={4}
        className="w-full rounded-card border border-cream-400 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors resize-y"
        disabled={isSubmitting}
      />

      {errors.length > 0 && (
        <>
          {renderHighlightedText()}
          <ul className="space-y-1" role="list" aria-label="Parse errors">
            {errors.map((error, i) => (
              <li key={i} className="text-sm text-red-600">
                <span className="font-medium">"{error.segment}"</span>: {error.message}
              </li>
            ))}
          </ul>
        </>
      )}

      {submitError && (
        <p className="text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          className="px-5 py-2.5 bg-charcoal text-cream-50 rounded-pill font-medium text-sm hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Parsing...' : 'Add to Wardrobe'}
        </button>
        <span className="text-xs text-charcoal-muted">
          Press ⌘+Enter to submit
        </span>
      </div>
    </div>
  );
}

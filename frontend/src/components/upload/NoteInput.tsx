interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export default function NoteInput({ value, onChange, maxLength = 280 }: NoteInputProps) {
  const remaining = maxLength - value.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining <= 20 && remaining >= 0;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-charcoal">Note (optional)</h3>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={3}
          placeholder="Add a note about today's outfit…"
          className="w-full px-3 py-2 text-sm border border-cream-400 rounded-card bg-white focus:outline-none focus:border-gold resize-none"
          aria-label="Personal note"
        />
        <span
          className={`absolute bottom-2 right-3 text-xs ${
            isOverLimit
              ? 'text-red-600 font-medium'
              : isNearLimit
                ? 'text-red-500'
                : 'text-charcoal-muted'
          }`}
          aria-live="polite"
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}

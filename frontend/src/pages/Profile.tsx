import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface StylePreferences {
  aesthetic?: string[];
  colorPreference?: string[];
  comfortLevel?: string;
  prioritize?: string;
  favoriteBrands?: string[];
}

const AESTHETIC_OPTIONS = [
  { value: 'minimalist', label: 'Minimalist', emoji: '◻️' },
  { value: 'classic', label: 'Classic', emoji: '🎩' },
  { value: 'bohemian', label: 'Bohemian', emoji: '🌻' },
  { value: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { value: 'romantic', label: 'Romantic', emoji: '🌸' },
  { value: 'edgy', label: 'Edgy', emoji: '⚡' },
];

const COLOR_OPTIONS = [
  { value: 'neutrals', label: 'Neutrals', emoji: '🤎' },
  { value: 'earth-tones', label: 'Earth Tones', emoji: '🍂' },
  { value: 'pastels', label: 'Pastels', emoji: '🩷' },
  { value: 'bold', label: 'Bold & Bright', emoji: '🔴' },
  { value: 'monochrome', label: 'Monochrome', emoji: '⬛' },
  { value: 'jewel-tones', label: 'Jewel Tones', emoji: '💎' },
];

const COMFORT_OPTIONS = [
  { value: 'safe', label: 'I stick to what I know', emoji: '🛡️' },
  { value: 'moderate', label: 'Open to suggestions', emoji: '🌤️' },
  { value: 'adventurous', label: 'Love trying new things', emoji: '🚀' },
];

const PRIORITY_OPTIONS = [
  { value: 'comfort', label: 'Comfort', emoji: '☁️' },
  { value: 'style', label: 'Style', emoji: '✨' },
  { value: 'versatility', label: 'Versatility', emoji: '🔄' },
  { value: 'confidence', label: 'Confidence', emoji: '💪' },
];

export default function Profile() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<StylePreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ styleProfile: { preferences: StylePreferences } | null }>('/users/me')
      .then((data) => {
        if (data.styleProfile?.preferences) {
          setPreferences(data.styleProfile.preferences);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const toggleMulti = (key: 'aesthetic' | 'colorPreference', value: string) => {
    const current = (preferences[key] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setPreferences({ ...preferences, [key]: updated });
  };

  const setSingle = (key: 'comfortLevel' | 'prioritize', value: string) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const setBrand = (index: number, value: string) => {
    const current = (preferences.favoriteBrands ?? []).slice();
    current[index] = value;
    setPreferences({ ...preferences, favoriteBrands: current });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.post('/users/style-profile', { preferences });
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const isSelected = (key: string, value: string): boolean => {
    const val = preferences[key as keyof StylePreferences];
    if (Array.isArray(val)) return val.includes(value);
    return val === value;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-semibold text-charcoal">Profile</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-cream-200 rounded w-1/3" />
          <div className="h-32 bg-cream-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-charcoal">Profile</h1>
        <p className="text-sm text-charcoal-muted mt-1">
          {user?.name ?? 'Your'} style preferences
        </p>
      </div>

      {/* Aesthetic */}
      <section className="drape-card space-y-3">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Aesthetic</h2>
        <p className="text-xs text-charcoal-muted">Select all that resonate with you</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AESTHETIC_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => toggleMulti('aesthetic', value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-card border text-sm transition-colors ${
                isSelected('aesthetic', value)
                  ? 'border-gold bg-cream-100 text-charcoal font-medium'
                  : 'border-cream-300 text-charcoal-muted hover:border-cream-400'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section className="drape-card space-y-3">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Color Palette</h2>
        <p className="text-xs text-charcoal-muted">Colors you gravitate toward</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => toggleMulti('colorPreference', value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-card border text-sm transition-colors ${
                isSelected('colorPreference', value)
                  ? 'border-gold bg-cream-100 text-charcoal font-medium'
                  : 'border-cream-300 text-charcoal-muted hover:border-cream-400'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Comfort Level */}
      <section className="drape-card space-y-3">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Fashion Adventurousness</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COMFORT_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setSingle('comfortLevel', value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-card border text-sm transition-colors ${
                isSelected('comfortLevel', value)
                  ? 'border-gold bg-cream-100 text-charcoal font-medium'
                  : 'border-cream-300 text-charcoal-muted hover:border-cream-400'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Priority */}
      <section className="drape-card space-y-3">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">What Matters Most</h2>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setSingle('prioritize', value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-card border text-sm transition-colors ${
                isSelected('prioritize', value)
                  ? 'border-gold bg-cream-100 text-charcoal font-medium'
                  : 'border-cream-300 text-charcoal-muted hover:border-cream-400'
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Favorite Brands */}
      <section className="drape-card space-y-3">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Brands You Love</h2>
        <p className="text-xs text-charcoal-muted">Brands whose style you admire</p>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="text"
              value={(preferences.favoriteBrands ?? [])[i] ?? ''}
              onChange={(e) => setBrand(i, e.target.value)}
              placeholder={`Brand ${i + 1}${i > 0 ? ' (optional)' : ''}`}
              className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-charcoal text-cream-50 rounded-pill font-medium text-sm hover:bg-charcoal-light disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saveMessage && (
          <span className="text-sm text-charcoal-muted">{saveMessage}</span>
        )}
      </div>
    </div>
  );
}

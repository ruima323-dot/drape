import { useState, useEffect, useRef } from 'react';
import type { AvatarConfig } from '@drape/shared';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveImageUrl } from '../lib/imageUrl';
import { supabase } from '../lib/supabase';
import BrandAutocomplete from '../components/today/BrandAutocomplete';

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

  // Avatar state
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState('');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

  useEffect(() => {
    api.get<{ styleProfile: { preferences: StylePreferences } | null; avatarConfig: AvatarConfig | null }>('/users/me')
      .then((data) => {
        if (data.styleProfile?.preferences) {
          setPreferences(data.styleProfile.preferences);
        }
        if (data.avatarConfig) {
          setAvatarConfig(data.avatarConfig);
          setHeight(data.avatarConfig.height ?? '');
          setWeight(data.avatarConfig.weight ?? '');
          setLocation(data.avatarConfig.location ?? '');
          if (data.avatarConfig.selfieUrl) {
            setSelfiePreview(resolveImageUrl(data.avatarConfig.selfieUrl));
          }
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
      // Save style preferences
      await api.post('/users/style-profile', { preferences });

      // Save avatar config
      const config: AvatarConfig = {
        bodyType: avatarConfig?.bodyType ?? 'average',
        skinTone: avatarConfig?.skinTone ?? 'medium',
        gender: avatarConfig?.gender ?? 'female',
        height: height || undefined,
        weight: weight || undefined,
        location: location || undefined,
        selfieUrl: avatarConfig?.selfieUrl,
      };
      await api.put('/users/avatar', config);

      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setSelfiePreview(localUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('selfie', file);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/users/selfie`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setSelfiePreview(resolveImageUrl(`${result.selfieUrl}?t=${Date.now()}`));
      setAvatarConfig((prev) => prev ? { ...prev, selfieUrl: result.selfieUrl } : null);
    } catch {
      setSelfiePreview(avatarConfig?.selfieUrl ? resolveImageUrl(avatarConfig.selfieUrl) : null);
    } finally {
      setIsUploading(false);
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

      {/* Avatar & Body */}
      <section className="drape-card space-y-4">
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Your Avatar</h2>
        <p className="text-xs text-charcoal-muted">Used to generate outfit previews that look like you</p>

        {/* Selfie */}
        <div className="flex items-center gap-4">
          {selfiePreview ? (
            <img
              src={selfiePreview}
              alt="Your selfie"
              className="w-20 h-20 rounded-full object-cover border-2 border-cream-400"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-cream-200 flex items-center justify-center text-charcoal-muted">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
          )}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm text-gold hover:text-gold-muted font-medium transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : selfiePreview ? 'Change selfie' : 'Upload selfie'}
            </button>
            <p className="text-xs text-charcoal-muted mt-0.5">Face photo for avatar generation</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handleSelfieUpload}
            className="hidden"
            aria-label="Select selfie photo"
          />
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="height" className="block text-xs font-medium text-charcoal mb-1">Height</label>
            <input
              id="height"
              type="text"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g., 5'10&quot; or 178cm"
              className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="weight" className="block text-xs font-medium text-charcoal mb-1">Weight</label>
            <input
              id="weight"
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 170 lbs or 77kg"
              className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-xs font-medium text-charcoal mb-1">Location</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Boston, MA"
            className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          />
          <p className="text-xs text-charcoal-muted mt-1">For weather-appropriate styling</p>
        </div>
      </section>

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
            <BrandAutocomplete
              key={i}
              value={(preferences.favoriteBrands ?? [])[i] ?? ''}
              onChange={(val) => setBrand(i, val)}
              placeholder={`Brand ${i + 1}${i > 0 ? ' (optional)' : ''}`}
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

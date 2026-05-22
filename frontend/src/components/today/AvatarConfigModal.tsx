import { useState, useEffect, useRef } from 'react';
import type { AvatarConfig } from '@drape/shared';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { resolveImageUrl } from '../../lib/imageUrl';

interface AvatarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AvatarConfig | null;
  onSave: (config: AvatarConfig) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export default function AvatarConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: AvatarConfigModalProps) {
  const [location, setLocation] = useState(currentConfig?.location ?? '');
  const [height, setHeight] = useState(currentConfig?.height ?? '');
  const [weight, setWeight] = useState(currentConfig?.weight ?? '');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when currentConfig loads from the API
  useEffect(() => {
    if (currentConfig) {
      setLocation(currentConfig.location ?? '');
      setHeight(currentConfig.height ?? '');
      setWeight(currentConfig.weight ?? '');
      if (currentConfig.selfieUrl) {
        setSelfiePreview(resolveImageUrl(currentConfig.selfieUrl));
      }
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setSelfiePreview(localUrl);

    // Upload to backend
    setIsUploading(true);
    setError(null);

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

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || 'Upload failed');
      }

      const result = await response.json();
      setSelfiePreview(resolveImageUrl(`${result.selfieUrl}?t=${Date.now()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload selfie.');
      setSelfiePreview(resolveImageUrl(currentConfig?.selfieUrl) ?? null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Preserve existing config fields, update location
      const config: AvatarConfig = {
        bodyType: currentConfig?.bodyType ?? 'average',
        skinTone: currentConfig?.skinTone ?? 'medium',
        gender: currentConfig?.gender ?? 'female',
        height: height || undefined,
        weight: weight || undefined,
        ethnicity: currentConfig?.ethnicity,
        location: location || undefined,
        selfieUrl: currentConfig?.selfieUrl,
      };
      await api.put('/users/avatar', config);
      onSave(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save avatar configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Avatar configuration"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative bg-white rounded-card-lg shadow-card-elevated p-card-lg w-full max-w-md mx-4">
        <h2 className="text-xl font-display font-semibold text-charcoal mb-1">
          Avatar Settings
        </h2>
        <p className="text-sm text-charcoal-muted mb-6">
          Upload a selfie so outfits are generated on your likeness.
        </p>

        <div className="space-y-5">
          {/* Selfie Upload */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Your Selfie
            </label>

            {selfiePreview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={selfiePreview}
                  alt="Your selfie"
                  className="w-32 h-32 rounded-full object-cover border-2 border-cream-400"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-sm text-gold hover:text-gold-muted transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Change photo'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-cream-400 rounded-card hover:border-gold transition-colors disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-charcoal-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-charcoal-muted">
                  {isUploading ? 'Uploading...' : 'Upload a selfie'}
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select selfie photo"
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="height"
                className="block text-sm font-medium text-charcoal mb-1.5"
              >
                Height
              </label>
              <input
                id="height"
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={`e.g., 5'10" or 178cm`}
                className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="weight"
                className="block text-sm font-medium text-charcoal mb-1.5"
              >
                Weight
              </label>
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
            <label
              htmlFor="location"
              className="block text-sm font-medium text-charcoal mb-1.5"
            >
              Location (for weather-appropriate styling)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Boston, MA"
              className="w-full rounded-card border border-cream-400 bg-white px-3 py-2.5 text-charcoal text-sm focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-charcoal-muted hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="px-5 py-2.5 bg-charcoal text-cream-50 rounded-pill font-medium text-sm hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

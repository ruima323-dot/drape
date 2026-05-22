import { useState, useCallback, useEffect } from 'react';
import type {
  OccasionContext,
  GeneratedOutfit,
  AvatarConfig,
  Accessory,
  AccessoryPlacement,
  AccessorySuggestion,
} from '@drape/shared';
import { api } from '../lib/api';
import { resolveImageUrl } from '../lib/imageUrl';
import ContextToggle from '../components/today/ContextToggle';
import AvatarCard from '../components/today/AvatarCard';
import AvatarConfigModal from '../components/today/AvatarConfigModal';
import StyleQuestionnaire from '../components/today/StyleQuestionnaire';
import AccessoryPromptInput from '../components/today/AccessoryPromptInput';
import AccessoryShelf from '../components/today/AccessoryShelf';
import SuggestionPanel from '../components/today/SuggestionPanel';
import SaveButton from '../components/today/SaveButton';

export default function Styling() {
  const [activeContext, setActiveContext] = useState<OccasionContext>(() => {
    const saved = localStorage.getItem('drape-styling-context');
    return (saved as OccasionContext) || 'casual';
  });
  const [outfit, setOutfit] = useState<GeneratedOutfit | null>(() => {
    const saved = localStorage.getItem('drape-styling-outfit');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Avatar config state
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Style questionnaire state
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [hasStyleProfile, setHasStyleProfile] = useState(false);

  // Accessories enriched with their full data for display
  const [activeAccessoryDetails, setActiveAccessoryDetails] = useState<
    (AccessoryPlacement & { accessory: Accessory })[]
  >([]);

  // Accessory shelf state
  const [shelfAccessories, setShelfAccessories] = useState<Accessory[]>([]);
  const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0);

  // Save state — tracks whether the outfit has been modified since last save
  const [outfitModifiedSinceSave, setOutfitModifiedSinceSave] = useState(false);

  // Derive active accessory IDs from the details array
  const activeAccessoryIds = new Set(
    activeAccessoryDetails.map((a) => a.accessoryId),
  );

  // Base avatar state
  const [baseAvatarUrl, setBaseAvatarUrl] = useState<string | null>(null);
  const [isGeneratingBaseAvatar, setIsGeneratingBaseAvatar] = useState(false);
  const [hasSelfie, setHasSelfie] = useState(false);

  // Fetch user's saved accessories, profile, and base avatar on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [accessoryData, profileData, baseAvatarData] = await Promise.all([
          api.get<{ accessories: Accessory[] }>('/accessories'),
          api.get<{ avatarConfig: AvatarConfig | null; styleProfile: { preferences: Record<string, unknown> } | null }>('/users/me'),
          api.get<{ baseAvatarUrl: string | null }>('/outfits/base-avatar'),
        ]);
        setShelfAccessories(accessoryData.accessories ?? []);
        if (profileData.avatarConfig) {
          setAvatarConfig(profileData.avatarConfig);
          if (profileData.avatarConfig.selfieUrl) {
            setHasSelfie(true);
          }
        }
        if (profileData.styleProfile && Object.keys(profileData.styleProfile.preferences).length > 0) {
          setHasStyleProfile(true);
        }
        if (baseAvatarData.baseAvatarUrl) {
          setBaseAvatarUrl(baseAvatarData.baseAvatarUrl);
        }
      } catch {
        // Non-critical — shelf will be empty, config will use defaults
      }
    };
    fetchInitialData();
  }, []);

  const handleGenerateBaseAvatar = async () => {
    setIsGeneratingBaseAvatar(true);
    try {
      const result = await api.post<{ baseAvatarUrl: string }>('/outfits/base-avatar', { force: true });
      setBaseAvatarUrl(result.baseAvatarUrl);
    } catch {
      // Show error if needed
    } finally {
      setIsGeneratingBaseAvatar(false);
    }
  };

  const generateOutfit = useCallback(
    async (context: OccasionContext) => {
      setIsGenerating(true);
      setGenerateError(null);

      try {
        const data = await api.post<{ outfit: GeneratedOutfit }>('/outfits/generate', {
          occasionContext: context,
        });
        setOutfit(data.outfit);
        localStorage.setItem('drape-styling-outfit', JSON.stringify(data.outfit));
        localStorage.setItem('drape-styling-context', context);
        // Reset accessory details when a new outfit is generated
        setActiveAccessoryDetails([]);
        // Mark outfit as modified (new generation resets saved state)
        setOutfitModifiedSinceSave(true);
        // Refresh suggestions for the new outfit
        setSuggestionRefreshKey((k) => k + 1);
      } catch (err) {
        setGenerateError(
          err instanceof Error ? err.message : 'Failed to generate outfit. Please try again.',
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const handleContextChange = (context: OccasionContext) => {
    setActiveContext(context);
    generateOutfit(context);
  };

  const handleRemoveAccessory = async (accessoryId: string) => {
    if (!outfit) return;

    try {
      await api.post('/accessories/composite', {
        outfitId: outfit.id,
        accessoryId,
        action: 'remove',
      });
      setActiveAccessoryDetails((prev) =>
        prev.filter((a) => a.accessoryId !== accessoryId),
      );
      // Mark outfit as modified after accessory removal
      setOutfitModifiedSinceSave(true);
    } catch {
      // Silently fail for now — the badge stays visible
    }
  };

  const handleAccessoryAdded = (accessory: Accessory) => {
    // Add to shelf if not already there
    setShelfAccessories((prev) => {
      if (prev.some((a) => a.id === accessory.id)) return prev;
      return [accessory, ...prev];
    });

    // Add to active accessories display
    setActiveAccessoryDetails((prev) => {
      if (prev.some((a) => a.accessoryId === accessory.id)) return prev;
      return [
        ...prev,
        {
          accessoryId: accessory.id,
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          accessory,
        },
      ];
    });

    // Mark outfit as modified after accessory change
    setOutfitModifiedSinceSave(true);

    // Refresh suggestions
    setSuggestionRefreshKey((k) => k + 1);
  };

  const handleShelfToggle = async (accessoryId: string) => {
    if (!outfit) return;

    try {
      await api.post('/accessories/composite', {
        outfitId: outfit.id,
        accessoryId,
        action: 'toggle',
      });

      const isCurrentlyActive = activeAccessoryIds.has(accessoryId);

      if (isCurrentlyActive) {
        // Remove from active
        setActiveAccessoryDetails((prev) =>
          prev.filter((a) => a.accessoryId !== accessoryId),
        );
      } else {
        // Add to active
        const accessory = shelfAccessories.find((a) => a.id === accessoryId);
        if (accessory) {
          setActiveAccessoryDetails((prev) => [
            ...prev,
            {
              accessoryId: accessory.id,
              position: { x: 0, y: 0 },
              scale: 1,
              rotation: 0,
              accessory,
            },
          ]);
        }
      }

      // Mark outfit as modified after accessory toggle
      setOutfitModifiedSinceSave(true);
    } catch {
      // Silently fail
    }
  };

  const handleAddSuggestion = async (suggestion: AccessorySuggestion) => {
    if (!outfit) return;

    const { accessory } = suggestion;

    try {
      // Save the suggested accessory to the shelf
      const savedResult = await api.post<{ accessory: Accessory }>(
        '/accessories',
        {
          type: accessory.type,
          color: accessory.color,
          material: accessory.material,
          label: accessory.label,
          emoji: accessory.emoji,
        },
      );

      const saved = savedResult.accessory ?? savedResult;

      // Composite it onto the outfit
      await api.post('/accessories/composite', {
        outfitId: outfit.id,
        accessoryId: (saved as Accessory).id,
        action: 'add',
      });

      handleAccessoryAdded(saved as Accessory);
    } catch {
      // Silently fail
    }
  };

  const handleAvatarSave = (config: AvatarConfig) => {
    setAvatarConfig(config);
  };

  const handleOutfitSaved = () => {
    setOutfitModifiedSinceSave(false);
  };

  const handleQuestionnaireComplete = () => {
    setHasStyleProfile(true);
    setIsQuestionnaireOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display font-semibold text-charcoal">
          Styling
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="px-3 py-2 text-sm text-charcoal-muted hover:text-charcoal hover:bg-cream-200 rounded-card transition-colors"
            aria-label="Avatar settings"
          >
            <span className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Avatar
            </span>
          </button>

          {!hasStyleProfile && (
            <button
              onClick={() => setIsQuestionnaireOpen(true)}
              className="px-3 py-2 text-sm text-gold hover:text-gold-muted hover:bg-cream-200 rounded-card transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Style Quiz
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Context toggle */}
      <div className="flex justify-center">
        <ContextToggle
          activeContext={activeContext}
          onContextChange={handleContextChange}
          disabled={isGenerating}
        />
      </div>

      {/* Avatar card */}
      <AvatarCard
        occasionContext={activeContext}
        outfitImageUrl={outfit?.imageUrl ? resolveImageUrl(outfit.imageUrl) : null}
        baseAvatarUrl={baseAvatarUrl ? resolveImageUrl(baseAvatarUrl) : null}
        isLoading={isGenerating}
        isLoadingBaseAvatar={isGeneratingBaseAvatar}
        activeAccessories={activeAccessoryDetails}
        onRemoveAccessory={handleRemoveAccessory}
      />

      {/* Generate Avatar button — shown when user has selfie but no base avatar */}
      {!baseAvatarUrl && !outfit && hasSelfie && !isGeneratingBaseAvatar && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerateBaseAvatar}
            className="px-5 py-2.5 bg-charcoal text-cream-50 rounded-pill font-medium text-sm hover:bg-charcoal-light transition-colors"
          >
            Generate My Avatar
          </button>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-center">
        <SaveButton
          generatedOutfitId={outfit?.id ?? null}
          outfitModified={outfitModifiedSinceSave}
          onSaved={handleOutfitSaved}
          disabled={isGenerating}
        />
      </div>

      {/* Error message */}
      {generateError && (
        <div className="drape-card text-center py-4">
          <p className="text-sm text-red-600 mb-2">{generateError}</p>
          <button
            onClick={() => generateOutfit(activeContext)}
            className="text-sm text-gold hover:text-gold-muted underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Accessory prompt input */}
      <AccessoryPromptInput
        outfitId={outfit?.id ?? null}
        onAccessoryAdded={handleAccessoryAdded}
        disabled={isGenerating}
      />

      {/* Accessory shelf */}
      <AccessoryShelf
        accessories={shelfAccessories}
        activeAccessoryIds={activeAccessoryIds}
        onToggle={handleShelfToggle}
        disabled={!outfit || isGenerating}
      />

      {/* Suggestion panel */}
      <SuggestionPanel
        outfitId={outfit?.id ?? null}
        onAddSuggestion={handleAddSuggestion}
        refreshKey={suggestionRefreshKey}
      />

      {/* Modals */}
      <AvatarConfigModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentConfig={avatarConfig}
        onSave={handleAvatarSave}
      />

      <StyleQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleQuestionnaireComplete}
      />
    </div>
  );
}

import type {
  WardrobeItem,
  OccasionContext,
  AvatarConfig,
  StyleProfile,
} from '@drape/shared';

// ─── Occasion-specific modifiers ─────────────────────────────────────────────

interface OccasionModifiers {
  setting: string;
  lighting: string;
  mood: string;
}

const OCCASION_MODIFIERS: Record<OccasionContext, OccasionModifiers> = {
  work: {
    setting: 'modern office environment',
    lighting: 'professional studio lighting',
    mood: 'polished and confident',
  },
  casual: {
    setting: 'relaxed outdoor setting',
    lighting: 'soft natural daylight',
    mood: 'relaxed and approachable',
  },
  night_out: {
    setting: 'upscale evening venue',
    lighting: 'dramatic moody lighting',
    mood: 'bold and glamorous',
  },
};

// ─── Quality modifiers ───────────────────────────────────────────────────────

const QUALITY_MODIFIERS =
  'high quality, fashion photography, full body shot, detailed clothing textures';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Filter wardrobe items to only those whose occasions array includes the
 * selected occasion context.
 */
export function filterItemsByOccasion(
  items: WardrobeItem[],
  occasion: OccasionContext
): WardrobeItem[] {
  return items.filter((item) => item.occasions.includes(occasion));
}

/**
 * Build a description string for the avatar based on its configuration.
 */
function buildAvatarDescription(avatar: AvatarConfig): string {
  // Use the detailed physical description from selfie analysis if available
  if (avatar.physicalDescription) {
    return avatar.physicalDescription;
  }

  // Fallback to manual config fields
  const genderDesc = avatar.gender === 'non-binary' ? 'person' : avatar.gender === 'female' ? 'woman' : 'man';
  const ethnicityDesc = avatar.ethnicity ? `${avatar.ethnicity} ` : '';
  return `a ${ethnicityDesc}${genderDesc} with ${avatar.bodyType} body type and ${avatar.skinTone} skin tone`;
}

/**
 * Get season and weather context based on current date and location.
 */
function getSeasonContext(location?: string): string {
  const month = new Date().getMonth(); // 0-11
  let season: string;
  let weatherHint: string;

  if (month >= 2 && month <= 4) {
    season = 'spring';
    weatherHint = 'mild weather, light layers appropriate';
  } else if (month >= 5 && month <= 7) {
    season = 'summer';
    weatherHint = 'warm weather, lightweight breathable fabrics';
  } else if (month >= 8 && month <= 10) {
    season = 'fall';
    weatherHint = 'cool weather, layering appropriate';
  } else {
    season = 'winter';
    weatherHint = 'cold weather, warm layers and outerwear needed';
  }

  const locationHint = location ? ` in ${location}` : '';
  return `Current season: ${season}${locationHint}. ${weatherHint}.`;
}

/**
 * Build a description string for a single wardrobe item.
 * Includes type, color, material, and fit when they are known.
 */
function describeItem(item: WardrobeItem): string {
  const parts: string[] = [];
  if (item.color && item.color !== 'unknown') parts.push(item.color);
  if (item.fit && item.fit !== 'regular' && item.fit !== 'unknown') parts.push(item.fit);
  if (item.material && item.material !== 'unknown') parts.push(item.material);
  parts.push(item.type);
  return parts.join(' ');
}

/**
 * Build a clothing description from a list of wardrobe items.
 */
function buildClothingDescription(items: WardrobeItem[]): string {
  if (items.length === 0) {
    return '';
  }
  const descriptions = items.map(describeItem);
  if (descriptions.length === 1) {
    return `wearing ${descriptions[0]}`;
  }
  const last = descriptions.pop()!;
  return `wearing ${descriptions.join(', ')} and ${last}`;
}

/**
 * Build the occasion-specific portion of the prompt.
 */
function buildOccasionDescription(occasion: OccasionContext): string {
  const modifiers = OCCASION_MODIFIERS[occasion];
  return `${modifiers.setting}, ${modifiers.lighting}, ${modifiers.mood}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build an image generation prompt from wardrobe items, occasion context,
 * avatar configuration, and an optional style profile.
 *
 * The prompt builder:
 * 1. Filters wardrobe items to only those matching the selected occasion
 * 2. Constructs a descriptive prompt including avatar description, clothing
 *    items, occasion-specific styling cues, and quality modifiers
 *
 * @param items - The user's full wardrobe items
 * @param occasion - The selected occasion context
 * @param avatar - The user's avatar configuration
 * @param styleProfile - Optional style profile for additional preferences
 * @returns The constructed prompt string for image generation
 */
export function buildPrompt(
  items: WardrobeItem[],
  occasion: OccasionContext,
  avatar: AvatarConfig,
  styleProfile?: StyleProfile
): string {
  const filteredItems = filterItemsByOccasion(items, occasion);

  const avatarDesc = buildAvatarDescription(avatar);
  const clothingDesc = buildClothingDescription(filteredItems);
  const occasionDesc = buildOccasionDescription(occasion);

  const promptParts: string[] = [avatarDesc];

  if (clothingDesc) {
    promptParts.push(clothingDesc);
  }

  promptParts.push(occasionDesc);

  if (styleProfile && Object.keys(styleProfile.preferences).length > 0) {
    const prefEntries = Object.entries(styleProfile.preferences)
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => `${key}: ${value}`);
    if (prefEntries.length > 0) {
      promptParts.push(prefEntries.join(', '));
    }
  }

  // Add season/weather context
  const seasonContext = getSeasonContext(avatar.location);
  promptParts.push(seasonContext);

  promptParts.push(QUALITY_MODIFIERS);

  return promptParts.join(', ');
}

/**
 * Build a prompt for reference-based image generation (selfie + outfit).
 * This prompt instructs the model to keep the person's appearance and only
 * change their clothing.
 *
 * @param items - The user's full wardrobe items
 * @param occasion - The selected occasion context
 * @param avatar - The user's avatar configuration
 * @param styleProfile - Optional style profile for additional preferences
 * @returns The constructed prompt string for image editing
 */
export function buildReferencePrompt(
  items: WardrobeItem[],
  occasion: OccasionContext,
  avatar: AvatarConfig,
  styleProfile?: StyleProfile
): string {
  const filteredItems = filterItemsByOccasion(items, occasion);
  const clothingDesc = buildClothingDescription(filteredItems);
  const occasionDesc = buildOccasionDescription(occasion);
  const seasonContext = getSeasonContext(avatar.location);

  const outfitDescription = clothingDesc
    ? clothingDesc.replace(/^wearing /, '')
    : 'a stylish outfit';

  const promptParts: string[] = [
    `Edit this photo to change ONLY the clothing. This must look like ONE cohesive photograph — the face, neck, body, and clothing must all share the same lighting, color temperature, and skin tone throughout. Do NOT composite or paste elements — generate the entire image as a unified whole.`,
    `Keep the person's face, body shape, hair, skin tone, and pose exactly the same. Dress them in: ${outfitDescription}.`,
    `The clothing should drape naturally on their body with realistic wrinkles, shadows, and fabric behavior. Skin tone must be perfectly consistent from face to hands to any exposed skin.`,
    `The setting should match a ${occasionDesc} context.`,
    seasonContext,
    'Generate exactly ONE single photo of this person. Do NOT create a collage, grid, or multiple images. One person, one outfit, one photo.',
  ];

  if (styleProfile && Object.keys(styleProfile.preferences).length > 0) {
    const prefEntries = Object.entries(styleProfile.preferences)
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => `${key}: ${value}`);
    if (prefEntries.length > 0) {
      promptParts.push(`Style preferences: ${prefEntries.join(', ')}.`);
    }
  }

  return promptParts.join(' ');
}

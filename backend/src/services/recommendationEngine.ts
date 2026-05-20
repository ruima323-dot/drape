import type {
  Accessory,
  AccessorySuggestion,
  GeneratedOutfit,
  OccasionContext,
  StyleProfile,
} from '@drape/shared';

// ─── Accessory Usage Record ─────────────────────────────────────────────────

export interface AccessoryUsageRecord {
  accessoryId: string;
  outfitId: string;
  occasionContext: OccasionContext;
  usedAt: Date;
}

// ─── Suggestion Params ──────────────────────────────────────────────────────

export interface SuggestionParams {
  currentOutfit: GeneratedOutfit;
  occasionContext: OccasionContext;
  wardrobeColorPalette: string[];
  userAccessories: Accessory[];
  accessoryHistory: AccessoryUsageRecord[];
  styleProfile?: StyleProfile;
}

// ─── Occasion-Based Accessory Definitions ───────────────────────────────────

interface AccessoryTemplate {
  type: string;
  label: string;
  emoji: string;
  occasions: OccasionContext[];
}

const ACCESSORY_TEMPLATES: AccessoryTemplate[] = [
  { type: 'watch', label: 'Classic Watch', emoji: '⌚', occasions: ['work', 'casual', 'night_out'] },
  { type: 'cufflinks', label: 'Cufflinks', emoji: '🔗', occasions: ['work'] },
  { type: 'tie', label: 'Tie', emoji: '👔', occasions: ['work'] },
  { type: 'belt', label: 'Leather Belt', emoji: '🪢', occasions: ['work', 'casual'] },
  { type: 'sunglasses', label: 'Sunglasses', emoji: '🕶️', occasions: ['casual'] },
  { type: 'bracelet', label: 'Bracelet', emoji: '📿', occasions: ['casual', 'night_out'] },
  { type: 'hat', label: 'Hat', emoji: '🧢', occasions: ['casual'] },
  { type: 'scarf', label: 'Scarf', emoji: '🧣', occasions: ['casual', 'work'] },
  { type: 'earrings', label: 'Earrings', emoji: '✨', occasions: ['night_out', 'casual'] },
  { type: 'necklace', label: 'Necklace', emoji: '📿', occasions: ['night_out'] },
  { type: 'ring', label: 'Statement Ring', emoji: '💍', occasions: ['night_out'] },
  { type: 'clutch', label: 'Clutch Bag', emoji: '👝', occasions: ['night_out'] },
];

// ─── Color Harmony Rules ────────────────────────────────────────────────────

const WARM_COLORS = [
  'red', 'orange', 'yellow', 'gold', 'coral', 'peach', 'rust', 'burgundy',
  'terracotta', 'amber', 'copper', 'bronze', 'cream', 'beige', 'tan', 'brown',
  'camel', 'khaki', 'warm',
];

const COOL_COLORS = [
  'blue', 'navy', 'teal', 'cyan', 'purple', 'lavender', 'violet', 'indigo',
  'silver', 'grey', 'gray', 'charcoal', 'slate', 'ice', 'mint', 'cool',
  'black', 'white', 'emerald', 'forest',
];

type ColorTone = 'warm' | 'cool' | 'neutral';

/**
 * Determine the dominant color tone from a palette of color strings.
 */
export function getDominantTone(colors: string[]): ColorTone {
  if (colors.length === 0) return 'neutral';

  let warmCount = 0;
  let coolCount = 0;

  for (const color of colors) {
    const lower = color.toLowerCase();
    if (WARM_COLORS.some((w) => lower.includes(w))) {
      warmCount++;
    }
    if (COOL_COLORS.some((c) => lower.includes(c))) {
      coolCount++;
    }
  }

  if (warmCount > coolCount) return 'warm';
  if (coolCount > warmCount) return 'cool';
  return 'neutral';
}

/**
 * Get the metal that harmonizes with a color tone.
 */
function getHarmonizingMetal(tone: ColorTone): { material: string; color: string } {
  switch (tone) {
    case 'warm':
      return { material: 'gold', color: 'gold' };
    case 'cool':
      return { material: 'silver', color: 'silver' };
    case 'neutral':
      return { material: 'silver', color: 'silver' };
  }
}

// ─── Usage History Helpers ──────────────────────────────────────────────────

/**
 * Count how many times an accessory type has been used in the given context.
 */
function getUsageCount(
  accessoryType: string,
  occasionContext: OccasionContext,
  history: AccessoryUsageRecord[],
  userAccessories: Accessory[]
): number {
  return history.filter((record) => {
    const accessory = userAccessories.find((a) => a.id === record.accessoryId);
    return (
      accessory &&
      accessory.type.toLowerCase() === accessoryType.toLowerCase() &&
      record.occasionContext === occasionContext
    );
  }).length;
}

// ─── Confidence Scoring ─────────────────────────────────────────────────────

/**
 * Calculate a confidence score (0–1) for a suggestion based on:
 * - Occasion match (base score)
 * - Color harmony alignment
 * - Usage history (less-used types get a small boost for variety)
 */
function calculateConfidence(
  template: AccessoryTemplate,
  occasionContext: OccasionContext,
  tone: ColorTone,
  metal: { material: string; color: string },
  usageCount: number
): number {
  // Base: occasion relevance
  let score = 0.5;

  // Boost if this is a primary occasion for the accessory
  const occasionIndex = template.occasions.indexOf(occasionContext);
  if (occasionIndex === 0) {
    score += 0.2; // primary occasion
  } else if (occasionIndex > 0) {
    score += 0.1; // secondary occasion
  }

  // Color harmony bonus
  if (tone !== 'neutral') {
    score += 0.15;
  }

  // Variety bonus: less-used accessories get a small boost
  if (usageCount === 0) {
    score += 0.1;
  } else if (usageCount <= 2) {
    score += 0.05;
  }

  return Math.min(1, Math.max(0, score));
}

// ─── Explanation Builder ────────────────────────────────────────────────────

function buildExplanation(
  template: AccessoryTemplate,
  occasionContext: OccasionContext,
  metal: { material: string; color: string },
  tone: ColorTone
): string {
  const occasionLabels: Record<OccasionContext, string> = {
    work: 'a professional setting',
    casual: 'a casual look',
    night_out: 'a night out',
  };

  const toneDescription =
    tone === 'warm'
      ? `${metal.color} tones complement your warm color palette`
      : tone === 'cool'
        ? `${metal.color} tones complement your cool color palette`
        : `${metal.color} tones work well as a versatile accent`;

  return `A ${metal.material} ${template.type} pairs well with ${occasionLabels[occasionContext]}. ${toneDescription}.`;
}

// ─── Owned Check ────────────────────────────────────────────────────────────

/**
 * Check if the user already owns an accessory matching the given type.
 */
function findOwnedAccessory(
  type: string,
  userAccessories: Accessory[]
): Accessory | undefined {
  return userAccessories.find(
    (a) => a.type.toLowerCase() === type.toLowerCase()
  );
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Suggest accessories that complement the current outfit based on:
 * - Occasion context (work → watch, cufflinks, tie; casual → sunglasses, bracelet, hat; night_out → earrings, necklace, ring)
 * - Color harmony (gold with warm tones, silver with cool tones)
 * - Usage history (promote variety)
 *
 * Each suggestion includes a non-empty explanation, a confidence score (0–1),
 * and an `owned` flag indicating whether the user already has a matching accessory.
 */
export async function suggestAccessories(params: SuggestionParams): Promise<AccessorySuggestion[]> {
  const {
    occasionContext,
    wardrobeColorPalette,
    userAccessories,
    accessoryHistory,
  } = params;

  // Determine color tone and harmonizing metal
  const tone = getDominantTone(wardrobeColorPalette);
  const metal = getHarmonizingMetal(tone);

  // Filter templates to those appropriate for the occasion
  const relevantTemplates = ACCESSORY_TEMPLATES.filter((t) =>
    t.occasions.includes(occasionContext)
  );

  // Build suggestions
  const suggestions: AccessorySuggestion[] = relevantTemplates.map((template) => {
    const usageCount = getUsageCount(template.type, occasionContext, accessoryHistory, userAccessories);
    const confidence = calculateConfidence(template, occasionContext, tone, metal, usageCount);
    const explanation = buildExplanation(template, occasionContext, metal, tone);

    const ownedAccessory = findOwnedAccessory(template.type, userAccessories);
    const owned = ownedAccessory !== undefined;

    // Use the owned accessory if available, otherwise create a suggestion accessory
    const accessory: Accessory = ownedAccessory ?? {
      id: `suggested-${template.type}-${metal.material}`,
      userId: '',
      type: template.type,
      color: metal.color,
      material: metal.material,
      label: `${metal.material.charAt(0).toUpperCase() + metal.material.slice(1)} ${template.label}`,
      emoji: template.emoji,
      createdAt: new Date(),
    };

    return {
      accessory,
      explanation,
      confidence,
      owned,
    };
  });

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

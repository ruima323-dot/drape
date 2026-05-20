import { v4 as uuidv4 } from 'uuid';
import type {
  WardrobeItem,
  Accessory,
  OccasionContext,
  ParseResult,
  ParseError,
} from '@drape/shared';

// ─── Format functions (round-trip support) ───────────────────────────────────

/**
 * Convert a WardrobeItem back to a canonical text representation.
 * Format: "{color} {fit} {material} {type}" — omits "unknown" values and "regular" fit.
 * The output can be parsed back by parseWardrobe to produce an equivalent item.
 */
export function formatWardrobeItem(item: WardrobeItem): string {
  const parts: string[] = [];
  if (item.color && item.color !== 'unknown') parts.push(item.color);
  if (item.fit && item.fit !== 'regular' && item.fit !== 'unknown') parts.push(item.fit);
  if (item.material && item.material !== 'unknown') parts.push(item.material);
  parts.push(item.type);
  return parts.join(' ');
}

/**
 * Convert an Accessory back to a canonical text representation.
 * Format: "{color} {material} {type}" — omits "unknown" values.
 * The output can be parsed back by parseAccessoryPrompt to produce an equivalent accessory.
 */
export function formatAccessory(accessory: Accessory): string {
  const parts: string[] = [];
  if (accessory.color && accessory.color !== 'unknown') parts.push(accessory.color);
  if (accessory.material && accessory.material !== 'unknown') parts.push(accessory.material);
  parts.push(accessory.type);
  return parts.join(' ');
}

// ─── Known vocabulary ────────────────────────────────────────────────────────

export const KNOWN_TYPES = [
  'tank top',
  't-shirt',
  'polo',
  'shirt',
  'blouse',
  'sweater',
  'hoodie',
  'cardigan',
  'vest',
  'blazer',
  'jacket',
  'coat',
  'dress',
  'skirt',
  'jeans',
  'pants',
  'trousers',
  'shorts',
  'suit',
  'sneakers',
  'boots',
  'loafers',
  'sandals',
  'heels',
  'flats',
  'oxfords',
  'running shoes',
  'dress shoes',
  'slides',
  'necklace',
  'earrings',
  'bracelet',
  'watch',
  'ring',
  'hat',
  'scarf',
  'belt',
  'sunglasses',
  'bag',
  'purse',
] as const;

export const KNOWN_COLORS = [
  'navy',
  'black',
  'white',
  'cream',
  'beige',
  'red',
  'blue',
  'green',
  'gray',
  'grey',
  'brown',
  'pink',
  'purple',
  'olive',
  'burgundy',
  'charcoal',
  'tan',
  'khaki',
  'yellow',
  'orange',
  'teal',
  'maroon',
  'ivory',
] as const;

export const KNOWN_MATERIALS = [
  'cotton',
  'linen',
  'silk',
  'wool',
  'denim',
  'leather',
  'polyester',
  'cashmere',
  'velvet',
  'satin',
  'chiffon',
  'tweed',
  'nylon',
  'fleece',
  'suede',
  'corduroy',
] as const;

const KNOWN_FITS = [
  'slim-fit',
  'slim fit',
  'slim',
  'relaxed',
  'oversized',
  'fitted',
  'regular',
  'wide-leg',
  'wide leg',
  'straight',
  'skinny',
  'loose',
  'tailored',
] as const;

// Map clothing types to default occasions
const TYPE_OCCASIONS: Record<string, OccasionContext[]> = {
  'tank top': ['casual'],
  't-shirt': ['casual'],
  polo: ['casual', 'work'],
  shirt: ['work', 'casual'],
  blouse: ['work', 'casual'],
  sweater: ['casual', 'work'],
  hoodie: ['casual'],
  cardigan: ['casual', 'work'],
  vest: ['casual', 'work'],
  blazer: ['work', 'casual'],
  jacket: ['casual', 'work'],
  coat: ['casual', 'work'],
  dress: ['work', 'casual', 'night_out'],
  skirt: ['work', 'casual', 'night_out'],
  jeans: ['casual'],
  pants: ['work', 'casual'],
  trousers: ['work', 'casual'],
  shorts: ['casual'],
  suit: ['work', 'night_out'],
  sneakers: ['casual'],
  boots: ['casual', 'work'],
  loafers: ['work', 'casual'],
  sandals: ['casual'],
  heels: ['work', 'night_out'],
  flats: ['work', 'casual'],
  oxfords: ['work'],
  'running shoes': ['casual'],
  'dress shoes': ['work', 'night_out'],
  slides: ['casual'],
  necklace: ['casual', 'night_out'],
  earrings: ['casual', 'work', 'night_out'],
  bracelet: ['casual', 'night_out'],
  watch: ['work', 'casual', 'night_out'],
  ring: ['casual', 'night_out'],
  hat: ['casual'],
  scarf: ['casual', 'work'],
  belt: ['work', 'casual'],
  sunglasses: ['casual'],
  bag: ['work', 'casual', 'night_out'],
  purse: ['casual', 'night_out'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find the first match from a list of keywords in the given text.
 * Returns the matched keyword or null.
 * Multi-word keywords are checked first (longest match wins).
 */
function findKeyword(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  // Sort by length descending so multi-word matches take priority
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    // Use word boundary matching to avoid partial matches
    const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    if (pattern.test(lower)) {
      return kw;
    }
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize fit values to a canonical form.
 */
function normalizeFit(fit: string): string {
  const mapping: Record<string, string> = {
    'slim-fit': 'slim',
    'slim fit': 'slim',
    'wide-leg': 'wide-leg',
    'wide leg': 'wide-leg',
  };
  return mapping[fit.toLowerCase()] ?? fit.toLowerCase();
}

/**
 * Normalize color values (e.g., grey → gray).
 */
function normalizeColor(color: string): string {
  if (color.toLowerCase() === 'grey') return 'gray';
  return color.toLowerCase();
}

// ─── Segment splitting ───────────────────────────────────────────────────────

interface TextSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * Split input text into segments on sentence boundaries, commas, or line breaks.
 * Tracks position offsets for error reporting.
 */
function splitIntoSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Split on: period followed by space/end, comma, newline, semicolon
  const pattern = /[.;]\s*|\n+|,\s*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const segText = text.slice(lastIndex, match.index).trim();
    if (segText.length > 0) {
      const start = lastIndex + (text.slice(lastIndex).length - text.slice(lastIndex).trimStart().length);
      segments.push({
        text: segText,
        start,
        end: match.index,
      });
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last delimiter
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    const start = lastIndex + (text.slice(lastIndex).length - text.slice(lastIndex).trimStart().length);
    segments.push({
      text: remaining,
      start,
      end: text.length,
    });
  }

  return segments;
}

// ─── Single item parser ──────────────────────────────────────────────────────

function parseSingleItem(segment: TextSegment): WardrobeItem | ParseError {
  const { text, start, end } = segment;

  const type = findKeyword(text, KNOWN_TYPES);
  if (!type) {
    return {
      segment: text,
      message: `Could not identify a clothing type in "${text}"`,
      position: { start, end },
    };
  }

  const color = findKeyword(text, KNOWN_COLORS);
  const material = findKeyword(text, KNOWN_MATERIALS);
  const fit = findKeyword(text, KNOWN_FITS);
  const occasions = TYPE_OCCASIONS[type] ?? ['casual'];

  return {
    id: uuidv4(),
    userId: '',
    type,
    color: color ? normalizeColor(color) : 'unknown',
    material: material ?? 'unknown',
    fit: fit ? normalizeFit(fit) : 'regular',
    occasions,
    createdAt: new Date(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a plain text description into one or more WardrobeItem objects.
 *
 * Handles multi-item descriptions by splitting on sentence boundaries,
 * commas, or line breaks. Returns a ParseResult with either the parsed
 * items or errors identifying unparseable segments.
 */
export function parseWardrobe(text: string): ParseResult<WardrobeItem[]> {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      errors: [
        {
          segment: text ?? '',
          message: 'Input text is empty',
          position: { start: 0, end: 0 },
        },
      ],
    };
  }

  const segments = splitIntoSegments(text);

  if (segments.length === 0) {
    return {
      success: false,
      errors: [
        {
          segment: text,
          message: 'No parseable segments found in input',
          position: { start: 0, end: text.length },
        },
      ],
    };
  }

  const items: WardrobeItem[] = [];
  const errors: ParseError[] = [];

  for (const segment of segments) {
    const result = parseSingleItem(segment);
    if ('id' in result) {
      items.push(result);
    } else {
      errors.push(result);
    }
  }

  // If we got at least one item, it's a success (partial parse is OK)
  if (items.length > 0) {
    return {
      success: true,
      data: items,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // No items parsed at all
  return {
    success: false,
    errors,
  };
}

// ─── Accessory vocabulary ────────────────────────────────────────────────────

const KNOWN_ACCESSORY_TYPES = [
  'bow tie',
  'hair clip',
  'earrings',
  'necklace',
  'bracelet',
  'watch',
  'ring',
  'hat',
  'scarf',
  'belt',
  'sunglasses',
  'brooch',
  'anklet',
  'cufflinks',
  'tie',
  'headband',
  'pendant',
] as const;

const KNOWN_ACCESSORY_MATERIALS = [
  'stainless steel',
  'rose gold',
  'gold',
  'silver',
  'platinum',
  'leather',
  'pearl',
  'diamond',
  'crystal',
  'titanium',
  'brass',
  'copper',
  'wood',
  'fabric',
  'beaded',
] as const;

const ACCESSORY_EMOJI: Record<string, string> = {
  earrings: '💎',
  necklace: '📿',
  bracelet: '📿',
  watch: '⌚',
  ring: '💍',
  hat: '🎩',
  scarf: '🧣',
  belt: '🪢',
  sunglasses: '🕶️',
  brooch: '💎',
  anklet: '📿',
  cufflinks: '💎',
  tie: '👔',
  'bow tie': '🎀',
  headband: '👑',
  'hair clip': '💎',
  pendant: '📿',
};

// ─── Accessory prompt parser ─────────────────────────────────────────────────

/**
 * Strip a leading "add" prefix from the prompt text.
 */
function stripAddPrefix(text: string): string {
  return text.replace(/^\s*add\s+/i, '');
}

/**
 * Build a human-readable label from the parsed accessory fields.
 */
function buildAccessoryLabel(
  color: string | null,
  material: string | null,
  type: string
): string {
  const parts: string[] = [];
  if (color && color !== 'unknown') parts.push(color);
  if (material && material !== 'unknown') parts.push(material);
  parts.push(type);
  return parts.join(' ');
}

/**
 * Parse a natural language accessory prompt into a single Accessory definition.
 *
 * Handles prompts like "add gold hoop earrings", "silver necklace",
 * "rose gold bracelet", etc. Strips an optional "add" prefix before parsing.
 *
 * Returns a ParseResult with either the parsed Accessory or errors
 * describing why the prompt could not be interpreted.
 */
export function parseAccessoryPrompt(prompt: string): ParseResult<Accessory> {
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      errors: [
        {
          segment: prompt ?? '',
          message: 'Accessory prompt is empty',
          position: { start: 0, end: 0 },
        },
      ],
    };
  }

  const cleaned = stripAddPrefix(prompt).trim();

  if (cleaned.length === 0) {
    return {
      success: false,
      errors: [
        {
          segment: prompt,
          message: 'Accessory prompt contains only the "add" prefix with no description',
          position: { start: 0, end: prompt.length },
        },
      ],
    };
  }

  const type = findKeyword(cleaned, KNOWN_ACCESSORY_TYPES);
  if (!type) {
    return {
      success: false,
      errors: [
        {
          segment: cleaned,
          message: `Could not identify an accessory type in "${cleaned}"`,
          position: { start: 0, end: prompt.length },
        },
      ],
    };
  }

  const color = findKeyword(cleaned, KNOWN_COLORS);
  const material = findKeyword(cleaned, KNOWN_ACCESSORY_MATERIALS);
  const emoji = ACCESSORY_EMOJI[type] ?? '✨';
  const label = buildAccessoryLabel(color, material, type);

  return {
    success: true,
    data: {
      id: uuidv4(),
      userId: '',
      type,
      color: color ? normalizeColor(color) : 'unknown',
      material: material ?? 'unknown',
      label,
      emoji,
      createdAt: new Date(),
    },
  };
}

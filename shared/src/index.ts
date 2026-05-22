// @drape/shared - Shared types and utilities

// ─── Occasion Context ────────────────────────────────────────────────────────

export type OccasionContext = 'work' | 'casual' | 'night_out';

// ─── Avatar & Style ──────────────────────────────────────────────────────────

export interface AvatarConfig {
  bodyType: string;
  skinTone: string;
  gender: 'female' | 'male' | 'non-binary';
  height?: string;
  weight?: string;
  ethnicity?: string;
  location?: string;
  selfieUrl?: string;
  physicalDescription?: string;
}

export interface StyleProfile {
  preferences: Record<string, unknown>;
}

// ─── Wardrobe ────────────────────────────────────────────────────────────────

export interface WardrobeItem {
  id: string;
  userId: string;
  type: string;
  color: string;
  material: string;
  fit: string;
  occasions: OccasionContext[];
  imageUrl?: string;
  createdAt: Date;
}

// ─── Accessory ───────────────────────────────────────────────────────────────

export interface Accessory {
  id: string;
  userId: string;
  type: string;
  color: string;
  material: string;
  label: string;
  emoji: string;
  imageUrl?: string;
  createdAt: Date;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export interface ParseError {
  segment: string;
  message: string;
  position: { start: number; end: number };
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: ParseError[];
}

// ─── Outfit Generation ───────────────────────────────────────────────────────

export interface GeneratedOutfit {
  id: string;
  userId: string;
  occasionContext: OccasionContext;
  wardrobeItemIds: string[];
  accessoryIds: string[];
  accessoryLayerState: AccessoryLayerState;
  imageUrl: string;
  avatarImageUrl?: string;
  createdAt: Date;
}

// ─── Saved Outfit ────────────────────────────────────────────────────────────

export interface SavedOutfit {
  id: string;
  userId: string;
  generatedOutfitId: string;
  name?: string;
  note?: string;
  savedAt: Date;
}

// ─── Accessory Compositor ────────────────────────────────────────────────────

export interface AccessoryPlacement {
  accessoryId: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface AccessoryLayerState {
  activeAccessories: AccessoryPlacement[];
}

export interface CompositeParams {
  baseImageUrl: string;
  currentAccessoryLayer: AccessoryLayerState;
  accessoryToAdd: Accessory;
}

export interface RemoveParams {
  baseImageUrl: string;
  currentAccessoryLayer: AccessoryLayerState;
  accessoryToRemove: string;
}

export interface ToggleParams {
  baseImageUrl: string;
  currentAccessoryLayer: AccessoryLayerState;
  accessoryToToggle: string;
  accessory: Accessory;
}

export interface CompositeResult {
  imageUrl: string;
  accessoryLayer: AccessoryLayerState;
}

// ─── Recommendation Engine ───────────────────────────────────────────────────

export interface AccessorySuggestion {
  accessory: Accessory;
  explanation: string;
  confidence: number;
  owned: boolean;
  purchaseUrl?: string;
}

// ─── Photo Upload & Vision ───────────────────────────────────────────────────

export interface IdentifiedItem {
  type: string;
  color: string;
  material: string;
  details?: string;
  bbox?: [number, number, number, number]; // [top, left, bottom, right] as percentages
  thumbnailUrl?: string;
}

export interface OutfitPhoto {
  id: string;
  userId: string;
  photoUrl: string;
  wardrobeItemIds: string[];
  occasionContext: OccasionContext;
  note?: string;
  createdAt: Date;
}

export interface VisionAnalysisResult {
  success: boolean;
  items: IdentifiedItem[];
  error?: string;
}

// ─── Journey Entry (Unified Timeline) ────────────────────────────────────────

export interface JourneyEntry {
  id: string;
  type: 'generated' | 'photo';
  occasionContext: OccasionContext;
  note?: string;
  date: string;
  // For generated outfits:
  imageUrl?: string;
  avatarImageUrl?: string;
  accessories?: { id: string; label: string; emoji: string }[];
  // For photo entries:
  photoUrl?: string;
  wardrobeItems?: { id: string; type: string; color: string; material: string }[];
}

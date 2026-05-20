import type {
  CompositeParams,
  RemoveParams,
  ToggleParams,
  CompositeResult,
  AccessoryLayerState,
  AccessoryPlacement,
} from '@drape/shared';

// ─── Default Positions by Accessory Type ─────────────────────────────────────

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  earrings: { x: 0.5, y: 0.2 },
  necklace: { x: 0.5, y: 0.35 },
  bracelet: { x: 0.15, y: 0.55 },
  watch: { x: 0.85, y: 0.55 },
  ring: { x: 0.15, y: 0.6 },
  hat: { x: 0.5, y: 0.05 },
  scarf: { x: 0.5, y: 0.3 },
  belt: { x: 0.5, y: 0.5 },
  sunglasses: { x: 0.5, y: 0.15 },
};

const DEFAULT_SCALE = 1.0;
const DEFAULT_ROTATION = 0;

/**
 * Get the default position for an accessory type.
 * Falls back to center (0.5, 0.5) for unknown types.
 */
export function getDefaultPosition(accessoryType: string): { x: number; y: number } {
  return DEFAULT_POSITIONS[accessoryType.toLowerCase()] ?? { x: 0.5, y: 0.5 };
}

// ─── addAccessory ────────────────────────────────────────────────────────────

/**
 * Add an accessory to the outfit's accessory layer.
 *
 * For MVP, compositing is tracked via AccessoryLayerState rather than
 * actual image manipulation. The composited image URL is set to the
 * base image URL (real compositing is a v2 enhancement).
 *
 * The base outfit image URL is NEVER modified (Property 7).
 *
 * @param params - The composite parameters including base image, current layer state, and accessory to add
 * @returns The composite result with updated image URL and layer state
 */
export async function addAccessory(params: CompositeParams): Promise<CompositeResult> {
  const { baseImageUrl, currentAccessoryLayer, accessoryToAdd } = params;

  const position = getDefaultPosition(accessoryToAdd.type);

  const newPlacement: AccessoryPlacement = {
    accessoryId: accessoryToAdd.id,
    position,
    scale: DEFAULT_SCALE,
    rotation: DEFAULT_ROTATION,
  };

  // Check if accessory is already in the layer; if so, replace its placement
  const existingIndex = currentAccessoryLayer.activeAccessories.findIndex(
    (p) => p.accessoryId === accessoryToAdd.id
  );

  const updatedAccessories =
    existingIndex >= 0
      ? currentAccessoryLayer.activeAccessories.map((p, i) =>
          i === existingIndex ? newPlacement : p
        )
      : [...currentAccessoryLayer.activeAccessories, newPlacement];

  const accessoryLayer: AccessoryLayerState = {
    activeAccessories: updatedAccessories,
  };

  // MVP: composited image URL is the base image URL
  // (actual image compositing is a v2 enhancement)
  return {
    imageUrl: baseImageUrl,
    accessoryLayer,
  };
}

// ─── removeAccessory ─────────────────────────────────────────────────────────

/**
 * Remove an accessory from the outfit's accessory layer.
 *
 * Rebuilds the layer state by filtering out the removed accessory.
 * The base outfit image URL is NEVER modified (Property 7).
 *
 * @param params - The remove parameters including base image, current layer state, and accessory ID to remove
 * @returns The composite result with updated image URL and layer state
 */
export async function removeAccessory(params: RemoveParams): Promise<CompositeResult> {
  const { baseImageUrl, currentAccessoryLayer, accessoryToRemove } = params;

  const updatedAccessories = currentAccessoryLayer.activeAccessories.filter(
    (p) => p.accessoryId !== accessoryToRemove
  );

  const accessoryLayer: AccessoryLayerState = {
    activeAccessories: updatedAccessories,
  };

  // MVP: composited image URL is the base image URL
  return {
    imageUrl: baseImageUrl,
    accessoryLayer,
  };
}

// ─── toggleAccessory ─────────────────────────────────────────────────────────

/**
 * Toggle an accessory on or off in the outfit's accessory layer.
 *
 * If the accessory is currently active, it is removed.
 * If the accessory is currently inactive, it is added.
 *
 * @param params - The toggle parameters including base image, current layer state, accessory ID, and accessory definition
 * @returns The composite result with updated image URL and layer state
 */
export async function toggleAccessory(params: ToggleParams): Promise<CompositeResult> {
  const { baseImageUrl, currentAccessoryLayer, accessoryToToggle, accessory } = params;

  const isActive = currentAccessoryLayer.activeAccessories.some(
    (p) => p.accessoryId === accessoryToToggle
  );

  if (isActive) {
    return removeAccessory({
      baseImageUrl,
      currentAccessoryLayer,
      accessoryToRemove: accessoryToToggle,
    });
  } else {
    return addAccessory({
      baseImageUrl,
      currentAccessoryLayer,
      accessoryToAdd: accessory,
    });
  }
}

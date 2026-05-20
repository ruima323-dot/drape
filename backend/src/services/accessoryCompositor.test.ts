import { describe, it, expect } from 'vitest';
import {
  addAccessory,
  removeAccessory,
  toggleAccessory,
  getDefaultPosition,
} from './accessoryCompositor';
import type {
  Accessory,
  AccessoryLayerState,
  CompositeParams,
  RemoveParams,
  ToggleParams,
} from '@drape/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccessory(overrides: Partial<Accessory> = {}): Accessory {
  return {
    id: 'acc-1',
    userId: 'user-1',
    type: 'earrings',
    color: 'gold',
    material: 'gold',
    label: 'gold hoop earrings',
    emoji: '💍',
    createdAt: new Date(),
    ...overrides,
  };
}

function emptyLayer(): AccessoryLayerState {
  return { activeAccessories: [] };
}

const BASE_IMAGE_URL = 'https://bucket.s3.us-east-1.amazonaws.com/outfits/user-1/outfit-1.png';

// ─── getDefaultPosition ──────────────────────────────────────────────────────

describe('getDefaultPosition', () => {
  it('returns correct position for earrings', () => {
    expect(getDefaultPosition('earrings')).toEqual({ x: 0.5, y: 0.2 });
  });

  it('returns correct position for necklace', () => {
    expect(getDefaultPosition('necklace')).toEqual({ x: 0.5, y: 0.35 });
  });

  it('returns correct position for bracelet', () => {
    expect(getDefaultPosition('bracelet')).toEqual({ x: 0.15, y: 0.55 });
  });

  it('returns correct position for watch', () => {
    expect(getDefaultPosition('watch')).toEqual({ x: 0.85, y: 0.55 });
  });

  it('returns correct position for ring', () => {
    expect(getDefaultPosition('ring')).toEqual({ x: 0.15, y: 0.6 });
  });

  it('returns correct position for hat', () => {
    expect(getDefaultPosition('hat')).toEqual({ x: 0.5, y: 0.05 });
  });

  it('returns correct position for scarf', () => {
    expect(getDefaultPosition('scarf')).toEqual({ x: 0.5, y: 0.3 });
  });

  it('returns correct position for belt', () => {
    expect(getDefaultPosition('belt')).toEqual({ x: 0.5, y: 0.5 });
  });

  it('returns correct position for sunglasses', () => {
    expect(getDefaultPosition('sunglasses')).toEqual({ x: 0.5, y: 0.15 });
  });

  it('is case-insensitive', () => {
    expect(getDefaultPosition('Earrings')).toEqual({ x: 0.5, y: 0.2 });
    expect(getDefaultPosition('NECKLACE')).toEqual({ x: 0.5, y: 0.35 });
  });

  it('returns center fallback for unknown type', () => {
    expect(getDefaultPosition('unknown')).toEqual({ x: 0.5, y: 0.5 });
  });
});

// ─── addAccessory ────────────────────────────────────────────────────────────

describe('addAccessory', () => {
  it('adds an accessory to an empty layer state', async () => {
    const accessory = makeAccessory({ type: 'earrings' });
    const params: CompositeParams = {
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    };

    const result = await addAccessory(params);

    expect(result.accessoryLayer.activeAccessories).toHaveLength(1);
    expect(result.accessoryLayer.activeAccessories[0]).toEqual({
      accessoryId: 'acc-1',
      position: { x: 0.5, y: 0.2 },
      scale: 1.0,
      rotation: 0,
    });
  });

  it('preserves the base image URL (Property 7)', async () => {
    const accessory = makeAccessory();
    const params: CompositeParams = {
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    };

    const result = await addAccessory(params);

    expect(result.imageUrl).toBe(BASE_IMAGE_URL);
  });

  it('adds multiple accessories to the layer', async () => {
    const earrings = makeAccessory({ id: 'acc-1', type: 'earrings' });
    const necklace = makeAccessory({ id: 'acc-2', type: 'necklace' });

    const result1 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: earrings,
    });

    const result2 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: result1.accessoryLayer,
      accessoryToAdd: necklace,
    });

    expect(result2.accessoryLayer.activeAccessories).toHaveLength(2);
    expect(result2.accessoryLayer.activeAccessories[0].accessoryId).toBe('acc-1');
    expect(result2.accessoryLayer.activeAccessories[1].accessoryId).toBe('acc-2');
  });

  it('uses the correct default position for each accessory type', async () => {
    const necklace = makeAccessory({ id: 'acc-n', type: 'necklace' });
    const result = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: necklace,
    });

    expect(result.accessoryLayer.activeAccessories[0].position).toEqual({ x: 0.5, y: 0.35 });
  });

  it('replaces placement if the same accessory is added again', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });

    const result1 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    });

    const result2 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: result1.accessoryLayer,
      accessoryToAdd: accessory,
    });

    expect(result2.accessoryLayer.activeAccessories).toHaveLength(1);
    expect(result2.accessoryLayer.activeAccessories[0].accessoryId).toBe('acc-1');
  });

  it('sets default scale and rotation', async () => {
    const accessory = makeAccessory();
    const result = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    });

    const placement = result.accessoryLayer.activeAccessories[0];
    expect(placement.scale).toBe(1.0);
    expect(placement.rotation).toBe(0);
  });
});

// ─── removeAccessory ─────────────────────────────────────────────────────────

describe('removeAccessory', () => {
  it('removes an accessory from the layer state', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });

    // First add
    const addResult = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    });

    // Then remove
    const removeResult = await removeAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: addResult.accessoryLayer,
      accessoryToRemove: 'acc-1',
    });

    expect(removeResult.accessoryLayer.activeAccessories).toHaveLength(0);
  });

  it('preserves the base image URL (Property 7)', async () => {
    const removeResult = await removeAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToRemove: 'acc-1',
    });

    expect(removeResult.imageUrl).toBe(BASE_IMAGE_URL);
  });

  it('does not modify other accessories when removing one', async () => {
    const earrings = makeAccessory({ id: 'acc-1', type: 'earrings' });
    const necklace = makeAccessory({ id: 'acc-2', type: 'necklace' });

    let layer = emptyLayer();
    const r1 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: layer,
      accessoryToAdd: earrings,
    });
    const r2 = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: r1.accessoryLayer,
      accessoryToAdd: necklace,
    });

    const removeResult = await removeAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: r2.accessoryLayer,
      accessoryToRemove: 'acc-1',
    });

    expect(removeResult.accessoryLayer.activeAccessories).toHaveLength(1);
    expect(removeResult.accessoryLayer.activeAccessories[0].accessoryId).toBe('acc-2');
  });

  it('handles removing a non-existent accessory gracefully', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });
    const addResult = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    });

    const removeResult = await removeAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: addResult.accessoryLayer,
      accessoryToRemove: 'non-existent-id',
    });

    // Layer should remain unchanged
    expect(removeResult.accessoryLayer.activeAccessories).toHaveLength(1);
    expect(removeResult.accessoryLayer.activeAccessories[0].accessoryId).toBe('acc-1');
  });
});

// ─── toggleAccessory ─────────────────────────────────────────────────────────

describe('toggleAccessory', () => {
  it('adds an inactive accessory when toggled', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });
    const params: ToggleParams = {
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToToggle: 'acc-1',
      accessory,
    };

    const result = await toggleAccessory(params);

    expect(result.accessoryLayer.activeAccessories).toHaveLength(1);
    expect(result.accessoryLayer.activeAccessories[0].accessoryId).toBe('acc-1');
  });

  it('removes an active accessory when toggled', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });

    // First add
    const addResult = await addAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToAdd: accessory,
    });

    // Then toggle off
    const toggleResult = await toggleAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: addResult.accessoryLayer,
      accessoryToToggle: 'acc-1',
      accessory,
    });

    expect(toggleResult.accessoryLayer.activeAccessories).toHaveLength(0);
  });

  it('toggle on then off returns to original state (Property 8)', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });
    const originalLayer = emptyLayer();

    // Toggle on
    const onResult = await toggleAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: originalLayer,
      accessoryToToggle: 'acc-1',
      accessory,
    });

    // Toggle off
    const offResult = await toggleAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: onResult.accessoryLayer,
      accessoryToToggle: 'acc-1',
      accessory,
    });

    expect(offResult.accessoryLayer.activeAccessories).toEqual(
      originalLayer.activeAccessories
    );
  });

  it('preserves the base image URL through toggle operations', async () => {
    const accessory = makeAccessory({ id: 'acc-1', type: 'earrings' });

    const onResult = await toggleAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: emptyLayer(),
      accessoryToToggle: 'acc-1',
      accessory,
    });

    expect(onResult.imageUrl).toBe(BASE_IMAGE_URL);

    const offResult = await toggleAccessory({
      baseImageUrl: BASE_IMAGE_URL,
      currentAccessoryLayer: onResult.accessoryLayer,
      accessoryToToggle: 'acc-1',
      accessory,
    });

    expect(offResult.imageUrl).toBe(BASE_IMAGE_URL);
  });
});

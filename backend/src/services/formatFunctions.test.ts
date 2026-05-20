import { describe, it, expect } from 'vitest';
import {
  formatWardrobeItem,
  formatAccessory,
  parseWardrobe,
  parseAccessoryPrompt,
} from './wardrobeParser';
import type { WardrobeItem, Accessory } from '@drape/shared';

// ─── Helper factories ────────────────────────────────────────────────────────

function makeWardrobeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: 'test-id',
    userId: '',
    type: 'shirt',
    color: 'navy',
    material: 'cotton',
    fit: 'regular',
    occasions: ['work', 'casual'],
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAccessory(overrides: Partial<Accessory> = {}): Accessory {
  return {
    id: 'test-id',
    userId: '',
    type: 'earrings',
    color: 'unknown',
    material: 'gold',
    label: 'gold earrings',
    emoji: '💎',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── formatWardrobeItem ──────────────────────────────────────────────────────

describe('formatWardrobeItem', () => {
  it('should format a fully described item', () => {
    const item = makeWardrobeItem({ color: 'navy', fit: 'slim', material: 'cotton', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('navy slim cotton shirt');
  });

  it('should omit "unknown" color', () => {
    const item = makeWardrobeItem({ color: 'unknown', material: 'cotton', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('cotton shirt');
  });

  it('should omit "unknown" material', () => {
    const item = makeWardrobeItem({ color: 'navy', material: 'unknown', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('navy shirt');
  });

  it('should omit "regular" fit', () => {
    const item = makeWardrobeItem({ color: 'navy', fit: 'regular', material: 'cotton', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('navy cotton shirt');
  });

  it('should include non-regular fit', () => {
    const item = makeWardrobeItem({ color: 'navy', fit: 'slim', material: 'cotton', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('navy slim cotton shirt');
  });

  it('should handle item with only type', () => {
    const item = makeWardrobeItem({ color: 'unknown', fit: 'regular', material: 'unknown', type: 'shirt' });
    expect(formatWardrobeItem(item)).toBe('shirt');
  });

  it('should handle multi-word types like tank top', () => {
    const item = makeWardrobeItem({ color: 'white', material: 'cotton', type: 'tank top' });
    expect(formatWardrobeItem(item)).toBe('white cotton tank top');
  });
});

// ─── formatAccessory ─────────────────────────────────────────────────────────

describe('formatAccessory', () => {
  it('should format an accessory with material only', () => {
    const acc = makeAccessory({ color: 'unknown', material: 'gold', type: 'earrings' });
    expect(formatAccessory(acc)).toBe('gold earrings');
  });

  it('should format an accessory with color and material', () => {
    const acc = makeAccessory({ color: 'black', material: 'leather', type: 'belt' });
    expect(formatAccessory(acc)).toBe('black leather belt');
  });

  it('should omit "unknown" color', () => {
    const acc = makeAccessory({ color: 'unknown', material: 'silver', type: 'necklace' });
    expect(formatAccessory(acc)).toBe('silver necklace');
  });

  it('should omit "unknown" material', () => {
    const acc = makeAccessory({ color: 'red', material: 'unknown', type: 'scarf' });
    expect(formatAccessory(acc)).toBe('red scarf');
  });

  it('should handle accessory with only type', () => {
    const acc = makeAccessory({ color: 'unknown', material: 'unknown', type: 'ring' });
    expect(formatAccessory(acc)).toBe('ring');
  });

  it('should handle multi-word types like bow tie', () => {
    const acc = makeAccessory({ color: 'red', material: 'unknown', type: 'bow tie' });
    expect(formatAccessory(acc)).toBe('red bow tie');
  });

  it('should handle multi-word materials like rose gold', () => {
    const acc = makeAccessory({ color: 'unknown', material: 'rose gold', type: 'bracelet' });
    expect(formatAccessory(acc)).toBe('rose gold bracelet');
  });
});

// ─── Round-trip tests: format → parse ────────────────────────────────────────

describe('WardrobeItem format → parse round-trip', () => {
  it('should round-trip a fully described item', () => {
    const original = makeWardrobeItem({ color: 'navy', fit: 'slim', material: 'cotton', type: 'shirt' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toHaveLength(1);
    const item = parsed.data![0];
    expect(item.type).toBe(original.type);
    expect(item.color).toBe(original.color);
    expect(item.material).toBe(original.material);
    expect(item.fit).toBe(original.fit);
  });

  it('should round-trip an item with unknown color', () => {
    const original = makeWardrobeItem({ color: 'unknown', material: 'cotton', type: 'shirt' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    const item = parsed.data![0];
    expect(item.type).toBe(original.type);
    expect(item.color).toBe('unknown');
    expect(item.material).toBe(original.material);
  });

  it('should round-trip an item with unknown material', () => {
    const original = makeWardrobeItem({ color: 'navy', material: 'unknown', type: 'shirt' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    const item = parsed.data![0];
    expect(item.type).toBe(original.type);
    expect(item.color).toBe(original.color);
    expect(item.material).toBe('unknown');
  });

  it('should round-trip an item with regular fit', () => {
    const original = makeWardrobeItem({ color: 'black', fit: 'regular', material: 'denim', type: 'jeans' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    const item = parsed.data![0];
    expect(item.type).toBe(original.type);
    expect(item.fit).toBe('regular');
  });

  it('should round-trip an item with oversized fit', () => {
    const original = makeWardrobeItem({ color: 'cream', fit: 'oversized', material: 'wool', type: 'sweater' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    const item = parsed.data![0];
    expect(item.type).toBe(original.type);
    expect(item.fit).toBe('oversized');
    expect(item.color).toBe(original.color);
    expect(item.material).toBe(original.material);
  });

  it('should round-trip a tank top', () => {
    const original = makeWardrobeItem({ color: 'white', material: 'cotton', type: 'tank top' });
    const formatted = formatWardrobeItem(original);
    const parsed = parseWardrobe(formatted);

    expect(parsed.success).toBe(true);
    expect(parsed.data![0].type).toBe('tank top');
  });
});

describe('Accessory format → parse round-trip', () => {
  it('should round-trip an accessory with material', () => {
    const original = makeAccessory({ color: 'unknown', material: 'gold', type: 'earrings' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    const acc = parsed.data!;
    expect(acc.type).toBe(original.type);
    expect(acc.material).toBe(original.material);
    expect(acc.color).toBe('unknown');
  });

  it('should round-trip an accessory with color and material', () => {
    const original = makeAccessory({ color: 'black', material: 'leather', type: 'belt' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    const acc = parsed.data!;
    expect(acc.type).toBe(original.type);
    expect(acc.color).toBe(original.color);
    expect(acc.material).toBe(original.material);
  });

  it('should round-trip an accessory with only color', () => {
    const original = makeAccessory({ color: 'red', material: 'unknown', type: 'scarf' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    const acc = parsed.data!;
    expect(acc.type).toBe(original.type);
    expect(acc.color).toBe(original.color);
    expect(acc.material).toBe('unknown');
  });

  it('should round-trip an accessory with only type', () => {
    const original = makeAccessory({ color: 'unknown', material: 'unknown', type: 'ring' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    const acc = parsed.data!;
    expect(acc.type).toBe(original.type);
    expect(acc.color).toBe('unknown');
    expect(acc.material).toBe('unknown');
  });

  it('should round-trip a multi-word type (bow tie)', () => {
    const original = makeAccessory({ color: 'red', material: 'unknown', type: 'bow tie' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    expect(parsed.data!.type).toBe('bow tie');
    expect(parsed.data!.color).toBe('red');
  });

  it('should round-trip a multi-word material (rose gold)', () => {
    const original = makeAccessory({ color: 'unknown', material: 'rose gold', type: 'bracelet' });
    const formatted = formatAccessory(original);
    const parsed = parseAccessoryPrompt(formatted);

    expect(parsed.success).toBe(true);
    expect(parsed.data!.type).toBe('bracelet');
    expect(parsed.data!.material).toBe('rose gold');
  });
});

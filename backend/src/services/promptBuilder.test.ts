import { describe, it, expect } from 'vitest';
import type { WardrobeItem, OccasionContext, AvatarConfig, StyleProfile } from '@drape/shared';
import { buildPrompt, filterItemsByOccasion } from './promptBuilder';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    type: 'shirt',
    color: 'navy',
    material: 'cotton',
    fit: 'slim',
    occasions: ['work', 'casual'] as OccasionContext[],
    createdAt: new Date(),
    ...overrides,
  };
}

const defaultAvatar: AvatarConfig = {
  bodyType: 'athletic',
  skinTone: 'medium',
};

// ─── filterItemsByOccasion ───────────────────────────────────────────────────

describe('filterItemsByOccasion', () => {
  it('should return only items matching the selected occasion', () => {
    const items: WardrobeItem[] = [
      makeItem({ id: '1', type: 'blazer', occasions: ['work'] }),
      makeItem({ id: '2', type: 'jeans', occasions: ['casual'] }),
      makeItem({ id: '3', type: 'dress', occasions: ['work', 'night_out'] }),
    ];

    const workItems = filterItemsByOccasion(items, 'work');
    expect(workItems).toHaveLength(2);
    expect(workItems.map((i) => i.type)).toEqual(['blazer', 'dress']);
  });

  it('should return empty array when no items match', () => {
    const items: WardrobeItem[] = [
      makeItem({ id: '1', type: 'jeans', occasions: ['casual'] }),
      makeItem({ id: '2', type: 'hoodie', occasions: ['casual'] }),
    ];

    const nightItems = filterItemsByOccasion(items, 'night_out');
    expect(nightItems).toHaveLength(0);
  });

  it('should return all items when all match the occasion', () => {
    const items: WardrobeItem[] = [
      makeItem({ id: '1', occasions: ['casual'] }),
      makeItem({ id: '2', occasions: ['casual'] }),
    ];

    const result = filterItemsByOccasion(items, 'casual');
    expect(result).toHaveLength(2);
  });

  it('should handle empty wardrobe', () => {
    const result = filterItemsByOccasion([], 'work');
    expect(result).toHaveLength(0);
  });
});

// ─── buildPrompt ─────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  describe('avatar config inclusion', () => {
    it('should include body type in the prompt', () => {
      const prompt = buildPrompt([], 'casual', { bodyType: 'athletic', skinTone: 'light' });
      expect(prompt).toContain('athletic');
      expect(prompt).toContain('body type');
    });

    it('should include skin tone in the prompt', () => {
      const prompt = buildPrompt([], 'casual', { bodyType: 'slim', skinTone: 'dark' });
      expect(prompt).toContain('dark');
      expect(prompt).toContain('skin tone');
    });

    it('should include both body type and skin tone for any avatar config', () => {
      const avatar: AvatarConfig = { bodyType: 'curvy', skinTone: 'olive' };
      const prompt = buildPrompt([], 'work', avatar);
      expect(prompt).toContain('curvy');
      expect(prompt).toContain('olive');
    });
  });

  describe('occasion-specific modifiers', () => {
    it('should include professional lighting for work context', () => {
      const prompt = buildPrompt([], 'work', defaultAvatar);
      expect(prompt).toContain('professional');
      expect(prompt).toContain('office');
    });

    it('should include relaxed setting for casual context', () => {
      const prompt = buildPrompt([], 'casual', defaultAvatar);
      expect(prompt).toContain('relaxed');
      expect(prompt).toContain('natural');
    });

    it('should include dramatic lighting for night out context', () => {
      const prompt = buildPrompt([], 'night_out', defaultAvatar);
      expect(prompt).toContain('dramatic');
      expect(prompt).toContain('evening');
    });
  });

  describe('clothing items in prompt', () => {
    it('should include item type, color, material, and fit in the prompt', () => {
      const items = [makeItem({ type: 'shirt', color: 'navy', material: 'cotton', fit: 'slim' })];
      const prompt = buildPrompt(items, 'work', defaultAvatar);
      expect(prompt).toContain('navy');
      expect(prompt).toContain('slim');
      expect(prompt).toContain('cotton');
      expect(prompt).toContain('shirt');
    });

    it('should only include items matching the selected occasion', () => {
      const items = [
        makeItem({ id: '1', type: 'blazer', color: 'charcoal', occasions: ['work'] }),
        makeItem({ id: '2', type: 'hoodie', color: 'gray', occasions: ['casual'] }),
      ];
      const prompt = buildPrompt(items, 'work', defaultAvatar);
      expect(prompt).toContain('charcoal');
      expect(prompt).toContain('blazer');
      expect(prompt).not.toContain('hoodie');
    });

    it('should include multiple matching items', () => {
      const items = [
        makeItem({ id: '1', type: 'shirt', color: 'white', occasions: ['work'] }),
        makeItem({ id: '2', type: 'pants', color: 'black', occasions: ['work'] }),
      ];
      const prompt = buildPrompt(items, 'work', defaultAvatar);
      expect(prompt).toContain('shirt');
      expect(prompt).toContain('pants');
    });

    it('should omit unknown color from item description', () => {
      const items = [makeItem({ color: 'unknown', occasions: ['work'] })];
      const prompt = buildPrompt(items, 'work', defaultAvatar);
      expect(prompt).not.toContain('unknown');
    });

    it('should omit regular fit from item description', () => {
      const items = [makeItem({ fit: 'regular', occasions: ['work'] })];
      const prompt = buildPrompt(items, 'work', defaultAvatar);
      // "regular" should not appear as a fit descriptor
      // but the item type should still be present
      expect(prompt).toContain('shirt');
    });
  });

  describe('empty wardrobe handling', () => {
    it('should produce a valid prompt with no wardrobe items', () => {
      const prompt = buildPrompt([], 'casual', defaultAvatar);
      expect(prompt).toBeTruthy();
      expect(prompt).toContain('athletic');
      expect(prompt).toContain('medium');
      expect(prompt).toContain('relaxed');
    });

    it('should produce a valid prompt when no items match the occasion', () => {
      const items = [makeItem({ occasions: ['casual'] })];
      const prompt = buildPrompt(items, 'night_out', defaultAvatar);
      expect(prompt).toBeTruthy();
      expect(prompt).toContain('athletic');
      expect(prompt).toContain('dramatic');
      // Should not contain the casual-only item
      expect(prompt).not.toContain('navy');
    });
  });

  describe('quality modifiers', () => {
    it('should include quality modifiers in the prompt', () => {
      const prompt = buildPrompt([], 'work', defaultAvatar);
      expect(prompt).toContain('high quality');
      expect(prompt).toContain('fashion photography');
    });
  });

  describe('style profile', () => {
    it('should include style profile preferences when provided', () => {
      const styleProfile: StyleProfile = {
        preferences: { aesthetic: 'minimalist', palette: 'earth tones' },
      };
      const prompt = buildPrompt([], 'casual', defaultAvatar, styleProfile);
      expect(prompt).toContain('minimalist');
      expect(prompt).toContain('earth tones');
    });

    it('should work without a style profile', () => {
      const prompt = buildPrompt([], 'casual', defaultAvatar);
      expect(prompt).toBeTruthy();
    });

    it('should handle empty style profile preferences', () => {
      const styleProfile: StyleProfile = { preferences: {} };
      const prompt = buildPrompt([], 'casual', defaultAvatar, styleProfile);
      expect(prompt).toBeTruthy();
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  suggestAccessories,
  getDominantTone,
  type SuggestionParams,
  type AccessoryUsageRecord,
} from './recommendationEngine';
import type { Accessory, GeneratedOutfit, OccasionContext } from '@drape/shared';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeOutfit(overrides: Partial<GeneratedOutfit> = {}): GeneratedOutfit {
  return {
    id: 'outfit-1',
    userId: 'user-1',
    occasionContext: 'casual',
    wardrobeItemIds: ['item-1'],
    accessoryIds: [],
    accessoryLayerState: { activeAccessories: [] },
    imageUrl: 'https://example.com/outfit.png',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAccessory(overrides: Partial<Accessory> = {}): Accessory {
  return {
    id: 'acc-1',
    userId: 'user-1',
    type: 'watch',
    color: 'gold',
    material: 'gold',
    label: 'Gold Watch',
    emoji: '⌚',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeParams(overrides: Partial<SuggestionParams> = {}): SuggestionParams {
  return {
    currentOutfit: makeOutfit(),
    occasionContext: 'casual',
    wardrobeColorPalette: ['navy', 'cream', 'brown'],
    userAccessories: [],
    accessoryHistory: [],
    ...overrides,
  };
}

// ─── getDominantTone ────────────────────────────────────────────────────────

describe('getDominantTone', () => {
  it('returns warm for warm-dominant palettes', () => {
    expect(getDominantTone(['red', 'gold', 'cream'])).toBe('warm');
  });

  it('returns cool for cool-dominant palettes', () => {
    expect(getDominantTone(['navy', 'silver', 'teal'])).toBe('cool');
  });

  it('returns neutral for empty palette', () => {
    expect(getDominantTone([])).toBe('neutral');
  });

  it('returns neutral for balanced palette', () => {
    expect(getDominantTone(['red', 'blue'])).toBe('neutral');
  });
});

// ─── suggestAccessories — Occasion Context ──────────────────────────────────

describe('suggestAccessories', () => {
  describe('occasion-based suggestions', () => {
    it('suggests work-appropriate accessories for work context', async () => {
      const suggestions = await suggestAccessories(
        makeParams({ occasionContext: 'work' })
      );

      const types = suggestions.map((s) => s.accessory.type);
      expect(types).toContain('watch');
      expect(types).toContain('cufflinks');
      expect(types).toContain('tie');
    });

    it('suggests casual-appropriate accessories for casual context', async () => {
      const suggestions = await suggestAccessories(
        makeParams({ occasionContext: 'casual' })
      );

      const types = suggestions.map((s) => s.accessory.type);
      expect(types).toContain('sunglasses');
      expect(types).toContain('hat');
      expect(types).toContain('bracelet');
    });

    it('suggests night-out-appropriate accessories for night_out context', async () => {
      const suggestions = await suggestAccessories(
        makeParams({ occasionContext: 'night_out' })
      );

      const types = suggestions.map((s) => s.accessory.type);
      expect(types).toContain('earrings');
      expect(types).toContain('necklace');
      expect(types).toContain('ring');
    });

    it('does not suggest work-only accessories for casual context', async () => {
      const suggestions = await suggestAccessories(
        makeParams({ occasionContext: 'casual' })
      );

      const types = suggestions.map((s) => s.accessory.type);
      expect(types).not.toContain('cufflinks');
      expect(types).not.toContain('tie');
    });
  });

  // ─── Explanations ───────────────────────────────────────────────────────

  describe('explanations', () => {
    it('provides a non-empty explanation for every suggestion', async () => {
      const contexts: OccasionContext[] = ['work', 'casual', 'night_out'];

      for (const ctx of contexts) {
        const suggestions = await suggestAccessories(
          makeParams({ occasionContext: ctx })
        );

        expect(suggestions.length).toBeGreaterThan(0);
        for (const suggestion of suggestions) {
          expect(suggestion.explanation).toBeTruthy();
          expect(suggestion.explanation.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ─── Owned Flag ─────────────────────────────────────────────────────────

  describe('owned flag', () => {
    it('marks suggestions as owned when user has matching accessory type', async () => {
      const userWatch = makeAccessory({ id: 'my-watch', type: 'watch' });
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'work',
          userAccessories: [userWatch],
        })
      );

      const watchSuggestion = suggestions.find((s) => s.accessory.type === 'watch');
      expect(watchSuggestion).toBeDefined();
      expect(watchSuggestion!.owned).toBe(true);
      // The suggestion should use the user's actual accessory
      expect(watchSuggestion!.accessory.id).toBe('my-watch');
    });

    it('marks suggestions as not owned when user lacks the accessory type', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'work',
          userAccessories: [],
        })
      );

      for (const suggestion of suggestions) {
        expect(suggestion.owned).toBe(false);
      }
    });

    it('correctly mixes owned and not-owned suggestions', async () => {
      const userBracelet = makeAccessory({ id: 'my-bracelet', type: 'bracelet' });
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'casual',
          userAccessories: [userBracelet],
        })
      );

      const braceletSuggestion = suggestions.find((s) => s.accessory.type === 'bracelet');
      const hatSuggestion = suggestions.find((s) => s.accessory.type === 'hat');

      expect(braceletSuggestion!.owned).toBe(true);
      expect(hatSuggestion!.owned).toBe(false);
    });
  });

  // ─── Color Harmony ──────────────────────────────────────────────────────

  describe('color harmony', () => {
    it('suggests gold-toned accessories for warm palettes', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'casual',
          wardrobeColorPalette: ['red', 'gold', 'cream', 'tan'],
        })
      );

      const unownedSuggestions = suggestions.filter((s) => !s.owned);
      for (const suggestion of unownedSuggestions) {
        expect(suggestion.accessory.material).toBe('gold');
        expect(suggestion.accessory.color).toBe('gold');
      }
    });

    it('suggests silver-toned accessories for cool palettes', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'casual',
          wardrobeColorPalette: ['navy', 'silver', 'teal', 'charcoal'],
        })
      );

      const unownedSuggestions = suggestions.filter((s) => !s.owned);
      for (const suggestion of unownedSuggestions) {
        expect(suggestion.accessory.material).toBe('silver');
        expect(suggestion.accessory.color).toBe('silver');
      }
    });

    it('includes color harmony info in explanations', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          occasionContext: 'work',
          wardrobeColorPalette: ['red', 'gold', 'cream'],
        })
      );

      for (const suggestion of suggestions) {
        expect(suggestion.explanation).toContain('gold');
        expect(suggestion.explanation).toContain('warm');
      }
    });
  });

  // ─── Empty Inputs ───────────────────────────────────────────────────────

  describe('empty inputs handling', () => {
    it('returns suggestions even with empty wardrobe color palette', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          wardrobeColorPalette: [],
        })
      );

      expect(suggestions.length).toBeGreaterThan(0);
      // With neutral tone, should default to silver
      const unownedSuggestions = suggestions.filter((s) => !s.owned);
      for (const suggestion of unownedSuggestions) {
        expect(suggestion.accessory.material).toBe('silver');
      }
    });

    it('returns suggestions even with empty user accessories', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          userAccessories: [],
        })
      );

      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(suggestion.owned).toBe(false);
      }
    });

    it('returns suggestions even with empty accessory history', async () => {
      const suggestions = await suggestAccessories(
        makeParams({
          accessoryHistory: [],
        })
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  // ─── Confidence Scores ────────────────────────────────────────────────

  describe('confidence scores', () => {
    it('returns confidence scores between 0 and 1', async () => {
      const suggestions = await suggestAccessories(makeParams());

      for (const suggestion of suggestions) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('returns suggestions sorted by confidence descending', async () => {
      const suggestions = await suggestAccessories(makeParams());

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          suggestions[i].confidence
        );
      }
    });
  });
});

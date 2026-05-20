import { describe, it, expect } from 'vitest';
import { parseAccessoryPrompt } from './wardrobeParser';

describe('parseAccessoryPrompt', () => {
  describe('valid prompts', () => {
    it('should parse a fully described accessory', () => {
      const result = parseAccessoryPrompt('gold hoop earrings');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const accessory = result.data!;
      expect(accessory.type).toBe('earrings');
      expect(accessory.color).toBe('unknown');
      expect(accessory.material).toBe('gold');
      expect(accessory.label).toBe('gold earrings');
      expect(accessory.emoji).toBe('💎');
      expect(accessory.id).toBeTruthy();
      expect(accessory.userId).toBe('');
      expect(accessory.createdAt).toBeInstanceOf(Date);
    });

    it('should parse a silver necklace', () => {
      const result = parseAccessoryPrompt('silver necklace');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('necklace');
      expect(result.data!.material).toBe('silver');
      expect(result.data!.emoji).toBe('📿');
    });

    it('should parse an accessory with color and material', () => {
      const result = parseAccessoryPrompt('black leather belt');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('belt');
      expect(result.data!.color).toBe('black');
      expect(result.data!.material).toBe('leather');
      expect(result.data!.emoji).toBe('🪢');
      expect(result.data!.label).toBe('black leather belt');
    });

    it('should parse a rose gold bracelet (multi-word material)', () => {
      const result = parseAccessoryPrompt('rose gold bracelet');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('bracelet');
      expect(result.data!.material).toBe('rose gold');
    });

    it('should parse a watch', () => {
      const result = parseAccessoryPrompt('stainless steel watch');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('watch');
      expect(result.data!.material).toBe('stainless steel');
      expect(result.data!.emoji).toBe('⌚');
    });

    it('should parse a bow tie (multi-word type)', () => {
      const result = parseAccessoryPrompt('red bow tie');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('bow tie');
      expect(result.data!.color).toBe('red');
      expect(result.data!.emoji).toBe('🎀');
    });

    it('should parse a hair clip (multi-word type)', () => {
      const result = parseAccessoryPrompt('pearl hair clip');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('hair clip');
      expect(result.data!.material).toBe('pearl');
    });

    it('should assign correct emojis for various types', () => {
      expect(parseAccessoryPrompt('ring').data!.emoji).toBe('💍');
      expect(parseAccessoryPrompt('hat').data!.emoji).toBe('🎩');
      expect(parseAccessoryPrompt('scarf').data!.emoji).toBe('🧣');
      expect(parseAccessoryPrompt('sunglasses').data!.emoji).toBe('🕶️');
      expect(parseAccessoryPrompt('tie').data!.emoji).toBe('👔');
      expect(parseAccessoryPrompt('headband').data!.emoji).toBe('👑');
    });
  });

  describe('prompts with "add" prefix', () => {
    it('should strip "add" prefix and parse correctly', () => {
      const result = parseAccessoryPrompt('add gold hoop earrings');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('earrings');
      expect(result.data!.material).toBe('gold');
    });

    it('should strip "Add" prefix (case-insensitive)', () => {
      const result = parseAccessoryPrompt('Add silver necklace');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('necklace');
      expect(result.data!.material).toBe('silver');
    });

    it('should strip "ADD" prefix (all caps)', () => {
      const result = parseAccessoryPrompt('ADD black leather belt');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('belt');
    });

    it('should handle "add" with extra leading whitespace', () => {
      const result = parseAccessoryPrompt('  add diamond ring');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('ring');
      expect(result.data!.material).toBe('diamond');
    });
  });

  describe('minimal prompts', () => {
    it('should parse a type-only prompt', () => {
      const result = parseAccessoryPrompt('earrings');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('earrings');
      expect(result.data!.color).toBe('unknown');
      expect(result.data!.material).toBe('unknown');
      expect(result.data!.label).toBe('earrings');
    });

    it('should parse a type with only color', () => {
      const result = parseAccessoryPrompt('red scarf');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('scarf');
      expect(result.data!.color).toBe('red');
      expect(result.data!.material).toBe('unknown');
      expect(result.data!.label).toBe('red scarf');
    });

    it('should parse a type with only material', () => {
      const result = parseAccessoryPrompt('leather bracelet');
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('bracelet');
      expect(result.data!.material).toBe('leather');
      expect(result.data!.color).toBe('unknown');
      expect(result.data!.label).toBe('leather bracelet');
    });
  });

  describe('invalid prompts', () => {
    it('should return error for empty string', () => {
      const result = parseAccessoryPrompt('');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toContain('empty');
    });

    it('should return error for whitespace-only input', () => {
      const result = parseAccessoryPrompt('   ');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return error for gibberish', () => {
      const result = parseAccessoryPrompt('asdfghjkl qwerty');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Could not identify an accessory type');
    });

    it('should return error for clothing types (not accessories)', () => {
      const result = parseAccessoryPrompt('navy cotton shirt');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return error for "add" with no description', () => {
      const result = parseAccessoryPrompt('add');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return error for numbers only', () => {
      const result = parseAccessoryPrompt('12345');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should include position info in errors', () => {
      const result = parseAccessoryPrompt('random nonsense');
      expect(result.success).toBe(false);
      const error = result.errors![0];
      expect(error.position).toBeDefined();
      expect(error.position.start).toBeGreaterThanOrEqual(0);
      expect(error.position.end).toBeGreaterThan(0);
      expect(error.segment).toBeTruthy();
    });
  });

  describe('color normalization', () => {
    it('should normalize grey to gray', () => {
      const result = parseAccessoryPrompt('grey scarf');
      expect(result.success).toBe(true);
      expect(result.data!.color).toBe('gray');
    });
  });
});

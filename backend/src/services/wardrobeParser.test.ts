import { describe, it, expect } from 'vitest';
import { parseWardrobe } from './wardrobeParser';

describe('parseWardrobe', () => {
  describe('single item parsing', () => {
    it('should parse a fully described item', () => {
      const result = parseWardrobe('navy slim-fit cotton shirt');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      const item = result.data![0];
      expect(item.type).toBe('shirt');
      expect(item.color).toBe('navy');
      expect(item.material).toBe('cotton');
      expect(item.fit).toBe('slim');
      expect(item.occasions).toContain('work');
      expect(item.occasions).toContain('casual');
      expect(item.id).toBeTruthy();
      expect(item.userId).toBe('');
      expect(item.createdAt).toBeInstanceOf(Date);
    });

    it('should parse an item with minimal description', () => {
      const result = parseWardrobe('black dress');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);

      const item = result.data![0];
      expect(item.type).toBe('dress');
      expect(item.color).toBe('black');
      expect(item.material).toBe('unknown');
      expect(item.fit).toBe('regular');
    });

    it('should normalize grey to gray', () => {
      const result = parseWardrobe('grey wool sweater');
      expect(result.success).toBe(true);
      expect(result.data![0].color).toBe('gray');
    });

    it('should normalize slim-fit and slim fit to slim', () => {
      const result1 = parseWardrobe('slim-fit cotton shirt');
      expect(result1.data![0].fit).toBe('slim');

      const result2 = parseWardrobe('slim fit cotton shirt');
      expect(result2.data![0].fit).toBe('slim');
    });

    it('should infer occasions from clothing type', () => {
      const blazerResult = parseWardrobe('navy blazer');
      expect(blazerResult.data![0].occasions).toContain('work');

      const jeansResult = parseWardrobe('blue jeans');
      expect(jeansResult.data![0].occasions).toEqual(['casual']);

      const dressResult = parseWardrobe('black dress');
      expect(dressResult.data![0].occasions).toContain('night_out');
    });
  });

  describe('multi-item parsing', () => {
    it('should parse comma-separated items', () => {
      const result = parseWardrobe('navy cotton shirt, black relaxed linen pants');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].type).toBe('shirt');
      expect(result.data![1].type).toBe('pants');
    });

    it('should parse newline-separated items', () => {
      const result = parseWardrobe('navy cotton shirt\nblack relaxed linen pants');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should parse period-separated items', () => {
      const result = parseWardrobe('navy cotton shirt. black relaxed linen pants');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should parse semicolon-separated items', () => {
      const result = parseWardrobe('navy cotton shirt; black relaxed linen pants');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should parse three or more items', () => {
      const result = parseWardrobe(
        'navy cotton shirt, black linen pants, charcoal wool blazer'
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });

  describe('items with missing fields', () => {
    it('should default material to unknown when not specified', () => {
      const result = parseWardrobe('navy shirt');
      expect(result.success).toBe(true);
      expect(result.data![0].material).toBe('unknown');
    });

    it('should default fit to regular when not specified', () => {
      const result = parseWardrobe('navy cotton shirt');
      expect(result.success).toBe(true);
      expect(result.data![0].fit).toBe('regular');
    });

    it('should default color to unknown when not specified', () => {
      const result = parseWardrobe('cotton shirt');
      expect(result.success).toBe(true);
      expect(result.data![0].color).toBe('unknown');
    });
  });

  describe('empty input', () => {
    it('should return error for empty string', () => {
      const result = parseWardrobe('');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error for whitespace-only input', () => {
      const result = parseWardrobe('   ');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('gibberish / unparseable input', () => {
    it('should return error for random gibberish', () => {
      const result = parseWardrobe('asdfghjkl qwerty');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].segment).toBeTruthy();
      expect(result.errors![0].message).toBeTruthy();
      expect(result.errors![0].position).toBeDefined();
      expect(result.errors![0].position.start).toBeGreaterThanOrEqual(0);
    });

    it('should return error for numbers only', () => {
      const result = parseWardrobe('12345 67890');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return error for special characters', () => {
      const result = parseWardrobe('!@#$%^&*()');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should succeed with partial parse when some segments are valid', () => {
      const result = parseWardrobe('navy cotton shirt, asdfghjkl');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
    });
  });

  describe('position tracking', () => {
    it('should track position offsets for errors', () => {
      const result = parseWardrobe('gibberish text');
      expect(result.success).toBe(false);
      const error = result.errors![0];
      expect(error.position.start).toBe(0);
      expect(error.position.end).toBe(14);
    });
  });

  describe('multi-word types', () => {
    it('should parse tank top correctly', () => {
      const result = parseWardrobe('white cotton tank top');
      expect(result.success).toBe(true);
      expect(result.data![0].type).toBe('tank top');
    });

    it('should parse t-shirt correctly', () => {
      const result = parseWardrobe('black cotton t-shirt');
      expect(result.success).toBe(true);
      expect(result.data![0].type).toBe('t-shirt');
    });
  });
});

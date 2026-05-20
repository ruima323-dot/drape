import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  WardrobeItem,
  OccasionContext,
  AvatarConfig,
  StyleProfile,
  GeneratedOutfit,
} from '@drape/shared';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('./promptBuilder.js', () => ({
  buildPrompt: vi.fn(),
  buildReferencePrompt: vi.fn(),
}));

vi.mock('./bedrockImageService.js', () => ({
  generateImage: vi.fn(),
  generateOutfitWithReference: vi.fn(),
}));

vi.mock('../db/repositories/generatedOutfitRepository.js', () => ({
  createGeneratedOutfit: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-outfit-id'),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true),
  };
});

import { generateOutfit } from './outfitGenerator';
import { buildPrompt, buildReferencePrompt } from './promptBuilder';
import { generateImage, generateOutfitWithReference } from './bedrockImageService';
import { createGeneratedOutfit } from '../db/repositories/generatedOutfitRepository';
import { existsSync } from 'fs';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUserId = 'user-123';

const mockAvatarConfig: AvatarConfig = {
  bodyType: 'athletic',
  skinTone: 'medium',
  gender: 'female',
};

const mockAvatarConfigWithSelfie: AvatarConfig = {
  bodyType: 'athletic',
  skinTone: 'medium',
  gender: 'female',
  selfieUrl: '/api/uploads/selfies/user-123.jpg',
};

const mockStyleProfile: StyleProfile = {
  preferences: { aesthetic: 'minimalist' },
};

const mockWardrobeItems: WardrobeItem[] = [
  {
    id: 'item-1',
    userId: mockUserId,
    type: 'shirt',
    color: 'navy',
    material: 'cotton',
    fit: 'slim',
    occasions: ['work', 'casual'] as OccasionContext[],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'item-2',
    userId: mockUserId,
    type: 'pants',
    color: 'black',
    material: 'wool',
    fit: 'regular',
    occasions: ['work'] as OccasionContext[],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'item-3',
    userId: mockUserId,
    type: 'sneakers',
    color: 'white',
    material: 'leather',
    fit: 'regular',
    occasions: ['casual'] as OccasionContext[],
    createdAt: new Date('2024-01-01'),
  },
];

const mockPrompt = 'a person with athletic body type and medium skin tone wearing navy slim cotton shirt and black wool pants';
const mockReferencePrompt = 'Dress this person in the following outfit...';

const mockImageBuffer = Buffer.from('generated-image-bytes');

const mockImageUrl = '/api/images/mock-outfit-id.png';

const mockGeneratedOutfit: GeneratedOutfit = {
  id: 'db-outfit-id',
  userId: mockUserId,
  occasionContext: 'work',
  wardrobeItemIds: ['item-1', 'item-2', 'item-3'],
  accessoryIds: [],
  accessoryLayerState: { activeAccessories: [] },
  imageUrl: mockImageUrl,
  createdAt: new Date('2024-06-15'),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('outfitGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(buildPrompt).mockReturnValue(mockPrompt);
    vi.mocked(buildReferencePrompt).mockReturnValue(mockReferencePrompt);
    vi.mocked(generateImage).mockResolvedValue(mockImageBuffer);
    vi.mocked(generateOutfitWithReference).mockResolvedValue(mockImageBuffer);
    vi.mocked(createGeneratedOutfit).mockResolvedValue(mockGeneratedOutfit);
    vi.mocked(existsSync).mockReturnValue(true);
  });

  describe('generateOutfit — successful end-to-end generation (text-only)', () => {
    it('should orchestrate prompt building, image generation, local save, and DB record creation', async () => {
      const result = await generateOutfit({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfig,
        styleProfile: mockStyleProfile,
      });

      // 1. buildPrompt called with correct args (no selfie = text-only path)
      expect(buildPrompt).toHaveBeenCalledOnce();
      expect(buildPrompt).toHaveBeenCalledWith(
        mockWardrobeItems,
        'work',
        mockAvatarConfig,
        mockStyleProfile
      );

      // 2. generateImage called with the prompt
      expect(generateImage).toHaveBeenCalledOnce();
      expect(generateImage).toHaveBeenCalledWith(mockPrompt);

      // 3. generateOutfitWithReference should NOT have been called
      expect(generateOutfitWithReference).not.toHaveBeenCalled();

      // 4. createGeneratedOutfit called with correct record data
      expect(createGeneratedOutfit).toHaveBeenCalledOnce();
      expect(createGeneratedOutfit).toHaveBeenCalledWith({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItemIds: ['item-1', 'item-2', 'item-3'],
        accessoryIds: [],
        accessoryLayerState: { activeAccessories: [] },
        imageUrl: mockImageUrl,
      });

      // 5. Returns the GeneratedOutfit from the repository
      expect(result).toEqual(mockGeneratedOutfit);
    });

    it('should work without a styleProfile', async () => {
      const result = await generateOutfit({
        userId: mockUserId,
        occasionContext: 'casual',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfig,
      });

      expect(buildPrompt).toHaveBeenCalledWith(
        mockWardrobeItems,
        'casual',
        mockAvatarConfig,
        undefined
      );

      expect(result).toEqual(mockGeneratedOutfit);
    });
  });

  describe('generateOutfit — reference-based generation with selfie', () => {
    it('should use generateOutfitWithReference when selfie exists', async () => {
      const result = await generateOutfit({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfigWithSelfie,
        styleProfile: mockStyleProfile,
      });

      // buildReferencePrompt should be called instead of buildPrompt
      expect(buildReferencePrompt).toHaveBeenCalledOnce();
      expect(buildReferencePrompt).toHaveBeenCalledWith(
        mockWardrobeItems,
        'work',
        mockAvatarConfigWithSelfie,
        mockStyleProfile
      );

      // generateOutfitWithReference should be called
      expect(generateOutfitWithReference).toHaveBeenCalledOnce();
      expect(generateOutfitWithReference).toHaveBeenCalledWith(
        mockReferencePrompt,
        expect.stringContaining('selfies/user-123.jpg')
      );

      // text-only generateImage should NOT be called
      expect(generateImage).not.toHaveBeenCalled();

      expect(result).toEqual(mockGeneratedOutfit);
    });

    it('should fall back to text-only when selfie file does not exist on disk', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await generateOutfit({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfigWithSelfie,
      });

      // Falls back to text-only
      expect(buildPrompt).toHaveBeenCalledOnce();
      expect(generateImage).toHaveBeenCalledOnce();
      expect(generateOutfitWithReference).not.toHaveBeenCalled();
    });
  });

  describe('generateOutfit — correct prompt building with filtered items', () => {
    it('should pass all wardrobe items to buildPrompt (filtering is done inside buildPrompt)', async () => {
      await generateOutfit({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfig,
      });

      // All items are passed; buildPrompt handles filtering internally
      expect(buildPrompt).toHaveBeenCalledWith(
        mockWardrobeItems,
        'work',
        mockAvatarConfig,
        undefined
      );
    });

    it('should include all wardrobe item IDs in the database record', async () => {
      await generateOutfit({
        userId: mockUserId,
        occasionContext: 'work',
        wardrobeItems: mockWardrobeItems,
        avatarConfig: mockAvatarConfig,
      });

      const createCall = vi.mocked(createGeneratedOutfit).mock.calls[0][0];
      expect(createCall.wardrobeItemIds).toEqual(['item-1', 'item-2', 'item-3']);
    });
  });

  describe('generateOutfit — error propagation from image generation', () => {
    it('should propagate errors from generateImage', async () => {
      const apiError = new Error('OpenAI API failure');
      apiError.name = 'BadRequestError';
      vi.mocked(generateImage).mockRejectedValue(apiError);

      await expect(
        generateOutfit({
          userId: mockUserId,
          occasionContext: 'work',
          wardrobeItems: mockWardrobeItems,
          avatarConfig: mockAvatarConfig,
        })
      ).rejects.toThrow('OpenAI API failure');

      // buildPrompt should have been called before the error
      expect(buildPrompt).toHaveBeenCalledOnce();
      // DB create should NOT have been called
      expect(createGeneratedOutfit).not.toHaveBeenCalled();
    });

    it('should propagate throttling errors after retries exhaust', async () => {
      const throttleError = new Error('rate limited');
      throttleError.name = 'RateLimitError';
      vi.mocked(generateImage).mockRejectedValue(throttleError);

      await expect(
        generateOutfit({
          userId: mockUserId,
          occasionContext: 'night_out',
          wardrobeItems: mockWardrobeItems,
          avatarConfig: mockAvatarConfig,
        })
      ).rejects.toThrow('rate limited');

      expect(createGeneratedOutfit).not.toHaveBeenCalled();
    });

    it('should propagate errors from generateOutfitWithReference', async () => {
      const apiError = new Error('Image edit failed');
      vi.mocked(generateOutfitWithReference).mockRejectedValue(apiError);

      await expect(
        generateOutfit({
          userId: mockUserId,
          occasionContext: 'work',
          wardrobeItems: mockWardrobeItems,
          avatarConfig: mockAvatarConfigWithSelfie,
        })
      ).rejects.toThrow('Image edit failed');

      expect(createGeneratedOutfit).not.toHaveBeenCalled();
    });
  });
});

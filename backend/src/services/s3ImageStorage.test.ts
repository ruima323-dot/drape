import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadOutfitImage,
  uploadAccessoryImage,
  getImageUrl,
  setClient,
  resetClient,
} from './s3ImageStorage';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function makeError(name: string, message = 'mock error'): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

function createMockClient(sendFn: (...args: unknown[]) => unknown) {
  return { send: sendFn } as never;
}

// ─── Environment setup ──────────────────────────────────────────────────────

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    S3_BUCKET_NAME: 'test-bucket',
    AWS_REGION: 'us-west-2',
  };
});

afterEach(() => {
  resetClient();
  process.env = ORIGINAL_ENV;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getImageUrl', () => {
  it('should construct the correct S3 URL from a key', () => {
    const url = getImageUrl('outfits/user-123/outfit-456.png');
    expect(url).toBe(
      'https://test-bucket.s3.us-west-2.amazonaws.com/outfits/user-123/outfit-456.png'
    );
  });
});

describe('uploadOutfitImage', () => {
  it('should upload an image and return the S3 URL', async () => {
    const sendMock = vi.fn().mockResolvedValue({});
    setClient(createMockClient(sendMock));

    const imageBuffer = Buffer.from('fake-image-data');
    const url = await uploadOutfitImage('user-123', 'outfit-456', imageBuffer);

    expect(url).toBe(
      'https://test-bucket.s3.us-west-2.amazonaws.com/outfits/user-123/outfit-456.png'
    );
    expect(sendMock).toHaveBeenCalledTimes(1);

    // Verify the command payload
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('test-bucket');
    expect(command.input.Key).toBe('outfits/user-123/outfit-456.png');
    expect(command.input.ContentType).toBe('image/png');
    expect(Buffer.from(command.input.Body).toString()).toBe('fake-image-data');
  });

  it('should use the correct key structure: outfits/{userId}/{outfitId}.png', async () => {
    const sendMock = vi.fn().mockResolvedValue({});
    setClient(createMockClient(sendMock));

    await uploadOutfitImage('abc', 'def', Buffer.from('data'));

    const command = sendMock.mock.calls[0][0];
    expect(command.input.Key).toBe('outfits/abc/def.png');
  });

  it('should retry once on failure and succeed on second attempt', async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValueOnce(makeError('ServiceException', 'S3 error'))
      .mockResolvedValueOnce({});

    setClient(createMockClient(sendMock));

    const url = await uploadOutfitImage(
      'user-1',
      'outfit-1',
      Buffer.from('data')
    );

    expect(url).toBe(
      'https://test-bucket.s3.us-west-2.amazonaws.com/outfits/user-1/outfit-1.png'
    );
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries (2 attempts) exceeded', async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValue(makeError('ServiceException', 'persistent failure'));

    setClient(createMockClient(sendMock));

    await expect(
      uploadOutfitImage('user-1', 'outfit-1', Buffer.from('data'))
    ).rejects.toThrow('persistent failure');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

describe('uploadAccessoryImage', () => {
  it('should upload an accessory image and return the S3 URL', async () => {
    const sendMock = vi.fn().mockResolvedValue({});
    setClient(createMockClient(sendMock));

    const imageBuffer = Buffer.from('accessory-image');
    const url = await uploadAccessoryImage(
      'user-789',
      'acc-012',
      imageBuffer
    );

    expect(url).toBe(
      'https://test-bucket.s3.us-west-2.amazonaws.com/accessories/user-789/acc-012.png'
    );
    expect(sendMock).toHaveBeenCalledTimes(1);

    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('test-bucket');
    expect(command.input.Key).toBe('accessories/user-789/acc-012.png');
    expect(command.input.ContentType).toBe('image/png');
  });

  it('should use the correct key structure: accessories/{userId}/{accessoryId}.png', async () => {
    const sendMock = vi.fn().mockResolvedValue({});
    setClient(createMockClient(sendMock));

    await uploadAccessoryImage('xyz', 'acc-1', Buffer.from('data'));

    const command = sendMock.mock.calls[0][0];
    expect(command.input.Key).toBe('accessories/xyz/acc-1.png');
  });

  it('should retry once on failure and succeed on second attempt', async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValueOnce(makeError('NetworkError', 'connection reset'))
      .mockResolvedValueOnce({});

    setClient(createMockClient(sendMock));

    const url = await uploadAccessoryImage(
      'user-1',
      'acc-1',
      Buffer.from('data')
    );

    expect(url).toBe(
      'https://test-bucket.s3.us-west-2.amazonaws.com/accessories/user-1/acc-1.png'
    );
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries (2 attempts) exceeded', async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValue(makeError('NetworkError', 'network down'));

    setClient(createMockClient(sendMock));

    await expect(
      uploadAccessoryImage('user-1', 'acc-1', Buffer.from('data'))
    ).rejects.toThrow('network down');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

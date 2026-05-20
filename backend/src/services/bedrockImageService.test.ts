import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateImage, setClient, resetClient } from './bedrockImageService';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function makeSuccessResponse(imageBase64: string) {
  return {
    data: [{ b64_json: imageBase64 }],
  };
}

function makeError(name: string, message = 'mock error'): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

function createMockClient(generateFn: (...args: unknown[]) => unknown) {
  return {
    images: {
      generate: generateFn,
      edit: vi.fn(),
    },
  } as never;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('bedrockImageService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    resetClient();
    vi.useRealTimers();
  });

  it('should return a decoded image buffer on successful generation', async () => {
    const imageContent = 'hello-image-bytes';
    const base64 = Buffer.from(imageContent).toString('base64');
    const generateMock = vi.fn().mockResolvedValue(makeSuccessResponse(base64));

    setClient(createMockClient(generateMock));

    const result = await generateImage('a person wearing a blue shirt');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe(imageContent);
    expect(generateMock).toHaveBeenCalledTimes(1);

    // Verify the call payload
    const callArgs = generateMock.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-image-2');
    expect(callArgs.prompt).toBe('a person wearing a blue shirt');
    expect(callArgs.n).toBe(1);
    expect(callArgs.size).toBe('1024x1024');
  });

  it('should retry on RateLimitError and succeed on second attempt', async () => {
    const imageContent = 'retry-success';
    const base64 = Buffer.from(imageContent).toString('base64');

    const generateMock = vi
      .fn()
      .mockRejectedValueOnce(makeError('RateLimitError'))
      .mockResolvedValueOnce(makeSuccessResponse(base64));

    setClient(createMockClient(generateMock));

    const result = await generateImage('test prompt');

    expect(result.toString()).toBe(imageContent);
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('should retry on APIConnectionError and succeed on second attempt', async () => {
    const imageContent = 'connection-success';
    const base64 = Buffer.from(imageContent).toString('base64');

    const generateMock = vi
      .fn()
      .mockRejectedValueOnce(makeError('APIConnectionError'))
      .mockResolvedValueOnce(makeSuccessResponse(base64));

    setClient(createMockClient(generateMock));

    const result = await generateImage('test prompt');

    expect(result.toString()).toBe(imageContent);
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('should retry on 429 status code', async () => {
    const imageContent = 'rate-limit-success';
    const base64 = Buffer.from(imageContent).toString('base64');

    const rateLimitErr = makeError('Error', 'too many requests');
    (rateLimitErr as unknown as { status: number }).status = 429;

    const generateMock = vi
      .fn()
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce(makeSuccessResponse(base64));

    setClient(createMockClient(generateMock));

    const result = await generateImage('test prompt');

    expect(result.toString()).toBe(imageContent);
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries exceeded for retryable errors', async () => {
    const generateMock = vi
      .fn()
      .mockRejectedValue(makeError('RateLimitError', 'rate limited'));

    setClient(createMockClient(generateMock));

    await expect(generateImage('test prompt')).rejects.toThrow('rate limited');
    expect(generateMock).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries exceeded for connection errors', async () => {
    const generateMock = vi
      .fn()
      .mockRejectedValue(makeError('APIConnectionError', 'connection failed'));

    setClient(createMockClient(generateMock));

    await expect(generateImage('test prompt')).rejects.toThrow(
      'connection failed'
    );
    expect(generateMock).toHaveBeenCalledTimes(3);
  });

  it('should throw immediately for non-retryable errors', async () => {
    const generateMock = vi
      .fn()
      .mockRejectedValue(makeError('BadRequestError', 'invalid prompt'));

    setClient(createMockClient(generateMock));

    await expect(generateImage('test prompt')).rejects.toThrow(
      'invalid prompt'
    );
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately for AuthenticationError', async () => {
    const generateMock = vi
      .fn()
      .mockRejectedValue(makeError('AuthenticationError', 'no access'));

    setClient(createMockClient(generateMock));

    await expect(generateImage('test prompt')).rejects.toThrow('no access');
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('should succeed on third attempt after two retryable failures', async () => {
    const imageContent = 'third-time-charm';
    const base64 = Buffer.from(imageContent).toString('base64');

    const generateMock = vi
      .fn()
      .mockRejectedValueOnce(makeError('RateLimitError'))
      .mockRejectedValueOnce(makeError('APIConnectionError'))
      .mockResolvedValueOnce(makeSuccessResponse(base64));

    setClient(createMockClient(generateMock));

    const result = await generateImage('test prompt');

    expect(result.toString()).toBe(imageContent);
    expect(generateMock).toHaveBeenCalledTimes(3);
  });
});

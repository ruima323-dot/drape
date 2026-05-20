import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from './auth.js';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('authMiddleware', () => {
  it('extracts userId from Bearer token', () => {
    const req = mockReq({ authorization: 'Bearer user-123' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthenticatedRequest).userId).toBe('user-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('extracts userId from x-user-id header as fallback', () => {
    const req = mockReq({ 'x-user-id': 'user-456' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthenticatedRequest).userId).toBe('user-456');
  });

  it('prefers Bearer token over x-user-id header', () => {
    const req = mockReq({
      authorization: 'Bearer user-from-token',
      'x-user-id': 'user-from-header',
    });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect((req as AuthenticatedRequest).userId).toBe('user-from-token');
  });

  it('returns 401 when no auth is provided', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('returns 401 for empty Bearer token', () => {
    const req = mockReq({ authorization: 'Bearer ' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for empty x-user-id header', () => {
    const req = mockReq({ 'x-user-id': '  ' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('trims whitespace from Bearer token', () => {
    const req = mockReq({ authorization: 'Bearer  user-trimmed  ' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect((req as AuthenticatedRequest).userId).toBe('user-trimmed');
    expect(next).toHaveBeenCalled();
  });

  it('trims whitespace from x-user-id header', () => {
    const req = mockReq({ 'x-user-id': '  user-trimmed  ' });
    const res = mockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect((req as AuthenticatedRequest).userId).toBe('user-trimmed');
    expect(next).toHaveBeenCalled();
  });
});

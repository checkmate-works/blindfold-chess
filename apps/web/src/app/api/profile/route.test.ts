import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { PUT } from './route';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    updateProfile: { action: 'update_profile', maxAttempts: 5, windowMs: 600_000 },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: () => ({
      set: () => ({
        where: mockWhere,
      }),
    }),
  },
  profiles: {
    id: 'id',
    displayName: 'display_name',
    bio: 'bio',
    country: 'country',
    flair: 'flair',
    fideId: 'fide_id',
    chesscomUsername: 'chesscom_username',
    lichessUsername: 'lichess_username',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/lame-name', () => ({
  isLameName: (name: string) => name === 'badname',
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

function createRequest(body: Record<string, unknown>): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

function createInvalidJsonRequest(): Request {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
  } as unknown as Request;
}

describe('PUT /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createRequest({ displayName: 'Test' });
      const response = await PUT(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });
    });
  });

  describe('ban enforcement', () => {
    it('should return 403 when user is banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(true);

      const request = createRequest({ displayName: 'Test' });
      const response = await PUT(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'banned' });
      expect(mockWhere).not.toHaveBeenCalled();
    });

    it('should proceed when user is not banned', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);

      const request = createRequest({ displayName: 'ValidName' });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = createInvalidJsonRequest();
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_json' });
    });

    it('should return 400 when displayName is missing', async () => {
      const request = createRequest({});
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'display_name_required' });
    });

    it('should return 400 when displayName is empty string', async () => {
      const request = createRequest({ displayName: '   ' });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'display_name_required' });
    });

    it('should return 400 when displayName exceeds 50 characters', async () => {
      const request = createRequest({ displayName: 'a'.repeat(51) });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'display_name_too_long' });
    });

    it('should return 400 for inappropriate displayName', async () => {
      const request = createRequest({ displayName: 'badname' });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'display_name_inappropriate' });
    });

    it('should return 400 when bio exceeds 500 characters', async () => {
      const request = createRequest({ displayName: 'Valid', bio: 'a'.repeat(501) });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'bio_too_long' });
    });

    it('should return 400 for invalid country code', async () => {
      const request = createRequest({ displayName: 'Valid', country: 'USA' });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: 'invalid_country' });
    });
  });

  describe('successful update', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
      mockIsUserBanned.mockResolvedValue(false);
    });

    it('should update profile and return success', async () => {
      const request = createRequest({
        displayName: 'Chess Player',
        bio: 'I love chess',
        country: 'us',
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should log update_profile activity event on success', async () => {
      const request = createRequest({ displayName: 'Chess Player' });
      await PUT(request);

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'update_profile',
        targetType: 'user',
        targetId: testUserId,
      });
    });

    it('should not log activity event when validation fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const request = createRequest({ displayName: 'Test' });
      await PUT(request);

      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });
});

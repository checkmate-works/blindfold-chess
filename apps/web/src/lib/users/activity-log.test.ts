import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: mockInsertValues,
    }),
  },
  userActivityLog: {},
}));

// Import after mocks are set up
const { logActivityEvent } = await import('./activity-log');

describe('logActivityEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert an activity event with all fields', () => {
    mockInsertValues.mockReturnValue({ then: (fn: () => void) => ({ catch: () => fn() }) });

    logActivityEvent({
      userId: 'user-123',
      action: 'create_post',
      targetType: 'topic_post',
      targetId: 'post-456',
      metadata: { topicKey: 'e4' },
    });

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: 'user-123',
      action: 'create_post',
      targetType: 'topic_post',
      targetId: 'post-456',
      metadata: { topicKey: 'e4' },
    });
  });

  it('should default optional fields to null/empty when not provided', () => {
    mockInsertValues.mockReturnValue({ then: (fn: () => void) => ({ catch: () => fn() }) });

    logActivityEvent({
      userId: 'user-123',
      action: 'login',
    });

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: 'user-123',
      action: 'login',
      targetType: null,
      targetId: null,
      metadata: {},
    });
  });

  it('should not throw when the insert fails', () => {
    const mockCatch = vi.fn();
    mockInsertValues.mockReturnValue({
      then: () => ({ catch: mockCatch }),
    });

    expect(() =>
      logActivityEvent({
        userId: 'user-123',
        action: 'login',
      })
    ).not.toThrow();
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockInsertValues.mockReturnValue({ then: (fn: () => void) => ({ catch: () => fn() }) });
    });

    it('should pass empty metadata object when metadata is explicitly {}', () => {
      logActivityEvent({
        userId: 'user-123',
        action: 'login',
        metadata: {},
      });

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'login',
        targetType: null,
        targetId: null,
        metadata: {},
      });
    });

    it('should default targetType to null when explicitly undefined', () => {
      logActivityEvent({
        userId: 'user-123',
        action: 'login',
        targetType: undefined,
        targetId: undefined,
        metadata: undefined,
      });

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'login',
        targetType: null,
        targetId: null,
        metadata: {},
      });
    });

    it('should handle a very long action string', () => {
      const longAction = 'a'.repeat(1000);

      logActivityEvent({
        userId: 'user-123',
        action: longAction,
      });

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: 'user-123',
        action: longAction,
        targetType: null,
        targetId: null,
        metadata: {},
      });
    });

    it('should handle metadata with nested objects and arrays', () => {
      const complexMetadata = {
        topicKey: 'e4',
        nested: { deep: { value: 42 } },
        tags: ['chess', 'opening'],
      };

      logActivityEvent({
        userId: 'user-123',
        action: 'create_post',
        metadata: complexMetadata,
      });

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'create_post',
        targetType: null,
        targetId: null,
        metadata: complexMetadata,
      });
    });

    it('should handle empty string userId and action (no runtime validation)', () => {
      logActivityEvent({
        userId: '',
        action: '',
      });

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: '',
        action: '',
        targetType: null,
        targetId: null,
        metadata: {},
      });
    });
  });

  describe('fire-and-forget behavior', () => {
    it('should invoke the .catch() handler on the promise chain (absorbs DB errors)', () => {
      const mockCatch = vi.fn();
      mockInsertValues.mockReturnValue({
        then: () => ({ catch: mockCatch }),
      });

      logActivityEvent({
        userId: 'user-123',
        action: 'login',
      });

      expect(mockCatch).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not throw even when the promise rejects synchronously', () => {
      mockInsertValues.mockReturnValue({
        then: () => ({
          catch: (fn: (err: Error) => void) => fn(new Error('DB connection lost')),
        }),
      });

      expect(() =>
        logActivityEvent({
          userId: 'user-123',
          action: 'login',
        })
      ).not.toThrow();
    });

    it('should call db.insert even when called rapidly (no debounce/throttle)', () => {
      mockInsertValues.mockReturnValue({ then: (fn: () => void) => ({ catch: () => fn() }) });

      logActivityEvent({ userId: 'u1', action: 'a1' });
      logActivityEvent({ userId: 'u2', action: 'a2' });
      logActivityEvent({ userId: 'u3', action: 'a3' });

      expect(mockInsertValues).toHaveBeenCalledTimes(3);
    });
  });
});

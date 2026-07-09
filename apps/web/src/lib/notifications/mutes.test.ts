import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockSelectRows: { id?: string; type?: string }[] = [];
const mockDbInsertValues = vi.fn();
const mockDbDeleteWhere = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        // isNotificationTypeMuted chains .limit(1); getMutedNotificationTypes
        // awaits the where() result directly — support both.
        where: () =>
          Object.assign(Promise.resolve(mockSelectRows), {
            limit: () => Promise.resolve(mockSelectRows),
          }),
      }),
    }),
    insert: () => ({
      values: (...args: unknown[]) => {
        mockDbInsertValues(...args);
        return { onConflictDoNothing: () => Promise.resolve() };
      },
    }),
    delete: () => ({
      where: (...args: unknown[]) => {
        mockDbDeleteWhere(...args);
        return Promise.resolve();
      },
    }),
  },
  notificationMutes: 'notificationMutes_table',
}));

vi.mock('server-only', () => ({}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (a: unknown, b: unknown) => [a, b],
  inArray: (a: unknown, b: unknown) => [a, b],
}));

const { isNotificationTypeMuted, getMutedNotificationTypes, setNotificationTypeMuted } =
  await import('./mutes');

describe('isNotificationTypeMuted', () => {
  beforeEach(() => {
    mockSelectRows = [];
  });

  it('returns false when no mute row exists', async () => {
    expect(await isNotificationTypeMuted('user-1', 'new_post')).toBe(false);
  });

  it('returns true when a mute row exists', async () => {
    mockSelectRows = [{ id: 'mute-1' }];
    expect(await isNotificationTypeMuted('user-1', 'new_post')).toBe(true);
  });
});

describe('getMutedNotificationTypes', () => {
  it('returns the muted types for the user', async () => {
    mockSelectRows = [{ type: 'new_post' }, { type: 'new_game' }];
    expect(await getMutedNotificationTypes('user-1')).toEqual(['new_post', 'new_game']);
  });

  it('returns an empty array when nothing is muted', async () => {
    mockSelectRows = [];
    expect(await getMutedNotificationTypes('user-1')).toEqual([]);
  });
});

describe('setNotificationTypeMuted', () => {
  beforeEach(() => {
    mockDbInsertValues.mockClear();
    mockDbDeleteWhere.mockClear();
  });

  it('inserts a mute row when muted=true', async () => {
    await setNotificationTypeMuted('user-1', 'new_post', true);

    expect(mockDbInsertValues).toHaveBeenCalledWith({ userId: 'user-1', type: 'new_post' });
    expect(mockDbDeleteWhere).not.toHaveBeenCalled();
  });

  it('deletes the mute row when muted=false', async () => {
    await setNotificationTypeMuted('user-1', 'new_post', false);

    expect(mockDbDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockDbInsertValues).not.toHaveBeenCalled();
  });
});

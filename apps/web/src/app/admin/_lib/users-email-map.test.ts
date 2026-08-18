import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { loadUsersEmailMap } from './users-email-map';

const mockListUsers = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
      },
    },
  }),
}));

function makeUser(id: string, email?: string): User {
  return { id, email } as unknown as User;
}

describe('loadUsersEmailMap', () => {
  it('returns an empty Map without calling listUsers when userIds is empty', async () => {
    const result = await loadUsersEmailMap([]);

    expect(result.size).toBe(0);
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('builds a Map of id -> email for matching users', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          makeUser('a', 'a@example.com'),
          makeUser('b', 'b@example.com'),
          makeUser('c', 'c@example.com'),
        ],
      },
    });

    const result = await loadUsersEmailMap(['a', 'c']);

    expect(result.size).toBe(2);
    expect(result.get('a')).toBe('a@example.com');
    expect(result.get('c')).toBe('c@example.com');
    expect(result.has('b')).toBe(false);
  });

  it('calls listUsers with the historical page=1, perPage=100 parameters', async () => {
    mockListUsers.mockResolvedValueOnce({ data: { users: [] } });

    await loadUsersEmailMap(['a']);

    expect(mockListUsers).toHaveBeenCalledTimes(1);
    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, perPage: 100 });
  });

  it('omits users without an email from the Map', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [makeUser('a', 'a@example.com'), makeUser('b'), makeUser('c', '')],
      },
    });

    const result = await loadUsersEmailMap(['a', 'b', 'c']);

    expect(result.size).toBe(1);
    expect(result.get('a')).toBe('a@example.com');
    expect(result.has('b')).toBe(false);
    expect(result.has('c')).toBe(false);
  });

  it('deduplicates userIds before lookup', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [makeUser('a', 'a@example.com'), makeUser('b', 'b@example.com')],
      },
    });

    const result = await loadUsersEmailMap(['a', 'a', 'b', 'a']);

    expect(result.size).toBe(2);
    expect(result.get('a')).toBe('a@example.com');
    expect(result.get('b')).toBe('b@example.com');
  });

  it('uses preloadedUsers without calling listUsers when provided', async () => {
    const preloadedUsers = [makeUser('a', 'a@example.com'), makeUser('b', 'b@example.com')];

    const result = await loadUsersEmailMap(['a', 'b'], { preloadedUsers });

    expect(result.size).toBe(2);
    expect(result.get('a')).toBe('a@example.com');
    expect(result.get('b')).toBe('b@example.com');
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('handles nullish data from listUsers gracefully', async () => {
    mockListUsers.mockResolvedValueOnce({ data: null });

    const result = await loadUsersEmailMap(['a']);

    expect(result.size).toBe(0);
  });

  it('skips users not present in userIds even if they have emails', async () => {
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          makeUser('a', 'a@example.com'),
          makeUser('b', 'b@example.com'),
          makeUser('extra', 'extra@example.com'),
        ],
      },
    });

    const result = await loadUsersEmailMap(['a', 'b']);

    expect(result.size).toBe(2);
    expect(result.has('extra')).toBe(false);
  });
});

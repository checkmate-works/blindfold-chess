import { describe, expect, it } from 'vitest';

/**
 * Tests for the post-fetch status filter logic used in the admin users page.
 * This logic is inline in page.tsx (lines 63-77) and filters users based on
 * their profile status after fetching from Supabase Auth.
 *
 * The filtering logic:
 * - 'active': profile != null && profile.bannedAt == null
 * - 'banned':  profile != null && profile.bannedAt != null
 * - 'anonymous': profile == null
 * - '' (all) or unknown: no filtering (return all users)
 */

type User = { id: string };
type Profile = { id: string; bannedAt: Date | null };

/**
 * Replicate the filter logic from page.tsx to test it in isolation.
 */
function filterUsersByStatus(
  users: User[],
  profileMap: Map<string, Profile>,
  statusFilter: string
): User[] {
  if (!statusFilter) return users;

  return users.filter((user) => {
    const profile = profileMap.get(user.id);
    switch (statusFilter) {
      case 'active':
        return profile != null && profile.bannedAt == null;
      case 'banned':
        return profile != null && profile.bannedAt != null;
      case 'anonymous':
        return profile == null;
      default:
        return true;
    }
  });
}

// Test fixtures
const activeUser: User = { id: 'user-1' };
const bannedUser: User = { id: 'user-2' };
const anonymousUser: User = { id: 'user-3' };

const activeProfile: Profile = { id: 'user-1', bannedAt: null };
const bannedProfile: Profile = { id: 'user-2', bannedAt: new Date('2024-01-15') };

function createProfileMap(profiles: Profile[]): Map<string, Profile> {
  return new Map(profiles.map((p) => [p.id, p]));
}

const allUsers = [activeUser, bannedUser, anonymousUser];
const profileMap = createProfileMap([activeProfile, bannedProfile]);

describe('filterUsersByStatus', () => {
  describe('no filter (All)', () => {
    it('should return all users when statusFilter is empty string', () => {
      const result = filterUsersByStatus(allUsers, profileMap, '');
      expect(result).toEqual(allUsers);
    });
  });

  describe('active filter', () => {
    it('should return only users with a profile and no ban', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'active');
      expect(result).toEqual([activeUser]);
    });

    it('should exclude banned users', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'active');
      expect(result).not.toContainEqual(bannedUser);
    });

    it('should exclude anonymous users (no profile)', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'active');
      expect(result).not.toContainEqual(anonymousUser);
    });
  });

  describe('banned filter', () => {
    it('should return only users with a profile and a ban date', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'banned');
      expect(result).toEqual([bannedUser]);
    });

    it('should exclude active users', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'banned');
      expect(result).not.toContainEqual(activeUser);
    });

    it('should exclude anonymous users', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'banned');
      expect(result).not.toContainEqual(anonymousUser);
    });
  });

  describe('anonymous filter', () => {
    it('should return only users without a profile', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'anonymous');
      expect(result).toEqual([anonymousUser]);
    });

    it('should exclude active users', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'anonymous');
      expect(result).not.toContainEqual(activeUser);
    });

    it('should exclude banned users', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'anonymous');
      expect(result).not.toContainEqual(bannedUser);
    });
  });

  describe('invalid filter value', () => {
    it('should return all users for an unknown status value', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'unknown');
      expect(result).toEqual(allUsers);
    });

    it('should return all users for a random string', () => {
      const result = filterUsersByStatus(allUsers, profileMap, 'foobar');
      expect(result).toEqual(allUsers);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no users match the filter', () => {
      const usersWithNoAnonymous = [activeUser, bannedUser];
      const result = filterUsersByStatus(usersWithNoAnonymous, profileMap, 'anonymous');
      expect(result).toEqual([]);
    });

    it('should handle empty users array', () => {
      const result = filterUsersByStatus([], profileMap, 'active');
      expect(result).toEqual([]);
    });

    it('should handle empty profile map', () => {
      const emptyProfileMap = new Map<string, Profile>();
      const result = filterUsersByStatus(allUsers, emptyProfileMap, 'anonymous');
      // All users are "anonymous" when there are no profiles
      expect(result).toEqual(allUsers);
    });

    it('should handle empty profile map with active filter', () => {
      const emptyProfileMap = new Map<string, Profile>();
      const result = filterUsersByStatus(allUsers, emptyProfileMap, 'active');
      // No users should match "active" when there are no profiles
      expect(result).toEqual([]);
    });

    it('should handle multiple active users', () => {
      const user4: User = { id: 'user-4' };
      const users = [...allUsers, user4];
      const profiles = createProfileMap([
        activeProfile,
        bannedProfile,
        { id: 'user-4', bannedAt: null },
      ]);
      const result = filterUsersByStatus(users, profiles, 'active');
      expect(result).toEqual([activeUser, user4]);
    });

    it('should handle multiple banned users', () => {
      const user4: User = { id: 'user-4' };
      const users = [...allUsers, user4];
      const profiles = createProfileMap([
        activeProfile,
        bannedProfile,
        { id: 'user-4', bannedAt: new Date('2024-02-20') },
      ]);
      const result = filterUsersByStatus(users, profiles, 'banned');
      expect(result).toEqual([bannedUser, user4]);
    });

    it('should handle all users being anonymous', () => {
      const emptyProfileMap = new Map<string, Profile>();
      const result = filterUsersByStatus(allUsers, emptyProfileMap, 'banned');
      expect(result).toEqual([]);
    });
  });
});

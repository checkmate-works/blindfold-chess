'use client';

import { useState } from 'react';

import { searchUsers } from '../_actions/searchUsers';
import type { SearchedUser } from '../_actions/searchUsers';
import type { UserSearchFilters } from './useUserSearchFilters';

export type UseUserSearchResultsReturn = {
  users: SearchedUser[];
  selectedIds: Set<string>;
  searching: boolean;
  hasSearched: boolean;
  error: string | null;
  /**
   * Run the search server action with the given filter snapshot. On success,
   * every returned user is auto-selected (matches the original useUserSearch
   * behavior).
   */
  runSearch: (filters: UserSearchFilters) => Promise<void>;
  toggleUser: (userId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
};

/**
 * Owns the result table state (rows, selection, request lifecycle) for the
 * bulk grant flow. Receives filter values per call so the filter hook is the
 * single source of truth for what gets queried.
 */
export function useUserSearchResults(): UseUserSearchResultsReturn {
  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(filters: UserSearchFilters) {
    setSearching(true);
    setError(null);
    setHasSearched(true);

    const result = await searchUsers({
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
      lastSignInFrom: filters.lastSignInFrom || undefined,
      lastSignInTo: filters.lastSignInTo || undefined,
      profileStatus: filters.profileStatus,
    });

    setSearching(false);

    if ('error' in result) {
      setError(result.error);
      setUsers([]);
      setSelectedIds(new Set());
      return;
    }

    setUsers(result.users);
    setSelectedIds(new Set(result.users.map((u) => u.userId)));
  }

  function toggleUser(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(users.map((u) => u.userId)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function reset() {
    setUsers([]);
    setSelectedIds(new Set());
    setHasSearched(false);
  }

  return {
    users,
    selectedIds,
    searching,
    hasSearched,
    error,
    runSearch,
    toggleUser,
    selectAll,
    deselectAll,
    reset,
  };
}

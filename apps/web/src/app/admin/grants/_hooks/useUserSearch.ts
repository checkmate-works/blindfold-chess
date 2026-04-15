'use client';

import { useState } from 'react';

import { searchUsers } from '../_actions/searchUsers';
import type { ProfileStatus, SearchedUser } from '../_actions/searchUsers';

type UseUserSearchResult = {
  // filter state
  createdFrom: string;
  createdTo: string;
  lastSignInFrom: string;
  lastSignInTo: string;
  profileStatus: ProfileStatus;
  setCreatedFrom: (v: string) => void;
  setCreatedTo: (v: string) => void;
  setLastSignInFrom: (v: string) => void;
  setLastSignInTo: (v: string) => void;
  setProfileStatus: (v: ProfileStatus) => void;
  // result state
  users: SearchedUser[];
  selectedIds: Set<string>;
  searching: boolean;
  hasSearched: boolean;
  error: string | null;
  // actions
  handleSearch: () => Promise<void>;
  toggleUser: (userId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
};

/**
 * Owns the filter form state and search result state for the bulk grant
 * "Search Users" flow. Selection is auto-populated to all found users on
 * a successful search.
 */
export function useUserSearch(): UseUserSearchResult {
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [lastSignInFrom, setLastSignInFrom] = useState('');
  const [lastSignInTo, setLastSignInTo] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('all');

  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    setError(null);
    setHasSearched(true);

    const result = await searchUsers({
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      lastSignInFrom: lastSignInFrom || undefined,
      lastSignInTo: lastSignInTo || undefined,
      profileStatus,
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
    createdFrom,
    createdTo,
    lastSignInFrom,
    lastSignInTo,
    profileStatus,
    setCreatedFrom,
    setCreatedTo,
    setLastSignInFrom,
    setLastSignInTo,
    setProfileStatus,
    users,
    selectedIds,
    searching,
    hasSearched,
    error,
    handleSearch,
    toggleUser,
    selectAll,
    deselectAll,
    reset,
  };
}

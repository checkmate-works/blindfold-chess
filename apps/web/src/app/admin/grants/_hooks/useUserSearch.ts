'use client';

import type { ProfileStatus, SearchedUser } from '../_actions/searchUsers';
import { useUserSearchFilters } from './useUserSearchFilters';
import { useUserSearchResults } from './useUserSearchResults';

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
 *
 * Implementation: thin orchestrator that composes `useUserSearchFilters`
 * (filter form) and `useUserSearchResults` (rows + selection + request
 * lifecycle). Each sub-hook owns one cohesive slice of state and can be
 * tested independently. The flat return shape is preserved so consumers
 * (currently only `BulkGrantForm`) do not have to change.
 */
export function useUserSearch(): UseUserSearchResult {
  const filters = useUserSearchFilters();
  const results = useUserSearchResults();

  return {
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    lastSignInFrom: filters.lastSignInFrom,
    lastSignInTo: filters.lastSignInTo,
    profileStatus: filters.profileStatus,
    setCreatedFrom: filters.setCreatedFrom,
    setCreatedTo: filters.setCreatedTo,
    setLastSignInFrom: filters.setLastSignInFrom,
    setLastSignInTo: filters.setLastSignInTo,
    setProfileStatus: filters.setProfileStatus,
    users: results.users,
    selectedIds: results.selectedIds,
    searching: results.searching,
    hasSearched: results.hasSearched,
    error: results.error,
    handleSearch: () => results.runSearch(filters),
    toggleUser: results.toggleUser,
    selectAll: results.selectAll,
    deselectAll: results.deselectAll,
    reset: results.reset,
  };
}

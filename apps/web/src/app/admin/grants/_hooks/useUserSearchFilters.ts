'use client';

import { useState } from 'react';

import type { ProfileStatus } from '../_actions/searchUsers';

/**
 * Filter values that drive the user search query. Exposed as a structural
 * type so the result hook can accept any object that satisfies this shape
 * without having to know about the setters.
 */
export type UserSearchFilters = {
  createdFrom: string;
  createdTo: string;
  lastSignInFrom: string;
  lastSignInTo: string;
  profileStatus: ProfileStatus;
};

export type UseUserSearchFiltersReturn = UserSearchFilters & {
  setCreatedFrom: (v: string) => void;
  setCreatedTo: (v: string) => void;
  setLastSignInFrom: (v: string) => void;
  setLastSignInTo: (v: string) => void;
  setProfileStatus: (v: ProfileStatus) => void;
};

/**
 * Owns the filter form state for the bulk grant "Search Users" flow.
 *
 * Split out from `useUserSearch` so the filter form and the result table
 * have independent state machines — neither one re-renders the other when
 * its own slice changes, and either can be tested in isolation.
 */
export function useUserSearchFilters(): UseUserSearchFiltersReturn {
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [lastSignInFrom, setLastSignInFrom] = useState('');
  const [lastSignInTo, setLastSignInTo] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('all');

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
  };
}

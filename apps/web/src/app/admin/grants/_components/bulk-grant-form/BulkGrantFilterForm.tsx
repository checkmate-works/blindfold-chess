'use client';

import type { ProfileStatus } from '../../_actions/searchUsers';

type BulkGrantFilterFormProps = {
  createdFrom: string;
  createdTo: string;
  lastSignInFrom: string;
  lastSignInTo: string;
  profileStatus: ProfileStatus;
  searching: boolean;
  onCreatedFromChange: (v: string) => void;
  onCreatedToChange: (v: string) => void;
  onLastSignInFromChange: (v: string) => void;
  onLastSignInToChange: (v: string) => void;
  onProfileStatusChange: (v: ProfileStatus) => void;
  onSearch: () => void;
};

export function BulkGrantFilterForm({
  createdFrom,
  createdTo,
  lastSignInFrom,
  lastSignInTo,
  profileStatus,
  searching,
  onCreatedFromChange,
  onCreatedToChange,
  onLastSignInFromChange,
  onLastSignInToChange,
  onProfileStatusChange,
  onSearch,
}: BulkGrantFilterFormProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="createdFrom" className="block text-sm font-medium mb-1">
            Registration Date (from)
          </label>
          <input
            type="date"
            id="createdFrom"
            value={createdFrom}
            onChange={(e) => onCreatedFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          />
        </div>
        <div>
          <label htmlFor="createdTo" className="block text-sm font-medium mb-1">
            Registration Date (to)
          </label>
          <input
            type="date"
            id="createdTo"
            value={createdTo}
            onChange={(e) => onCreatedToChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          />
        </div>
        <div>
          <label htmlFor="lastSignInFrom" className="block text-sm font-medium mb-1">
            Last Sign-in (from)
          </label>
          <input
            type="date"
            id="lastSignInFrom"
            value={lastSignInFrom}
            onChange={(e) => onLastSignInFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          />
        </div>
        <div>
          <label htmlFor="lastSignInTo" className="block text-sm font-medium mb-1">
            Last Sign-in (to)
          </label>
          <input
            type="date"
            id="lastSignInTo"
            value={lastSignInTo}
            onChange={(e) => onLastSignInToChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          />
        </div>
        <div>
          <label htmlFor="profileStatus" className="block text-sm font-medium mb-1">
            Profile Status
          </label>
          <select
            id="profileStatus"
            value={profileStatus}
            onChange={(e) => onProfileStatusChange(e.target.value as ProfileStatus)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          >
            <option value="all">All</option>
            <option value="anonymous">Anonymous (no displayName)</option>
            <option value="has_profile">Has Profile (displayName set)</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={searching}
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {searching ? 'Searching...' : 'Search Users'}
      </button>
    </>
  );
}

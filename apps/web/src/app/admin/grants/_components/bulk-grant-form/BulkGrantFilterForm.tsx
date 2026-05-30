'use client';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';

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
        <Field label="Registration Date (from)" htmlFor="createdFrom">
          <Input
            type="date"
            id="createdFrom"
            value={createdFrom}
            onChange={(e) => onCreatedFromChange(e.target.value)}
          />
        </Field>
        <Field label="Registration Date (to)" htmlFor="createdTo">
          <Input
            type="date"
            id="createdTo"
            value={createdTo}
            onChange={(e) => onCreatedToChange(e.target.value)}
          />
        </Field>
        <Field label="Last Sign-in (from)" htmlFor="lastSignInFrom">
          <Input
            type="date"
            id="lastSignInFrom"
            value={lastSignInFrom}
            onChange={(e) => onLastSignInFromChange(e.target.value)}
          />
        </Field>
        <Field label="Last Sign-in (to)" htmlFor="lastSignInTo">
          <Input
            type="date"
            id="lastSignInTo"
            value={lastSignInTo}
            onChange={(e) => onLastSignInToChange(e.target.value)}
          />
        </Field>
        <Field label="Profile Status" htmlFor="profileStatus">
          <Select
            id="profileStatus"
            value={profileStatus}
            onChange={(e) => onProfileStatusChange(e.target.value as ProfileStatus)}
          >
            <option value="all">All</option>
            <option value="anonymous">Anonymous (no displayName)</option>
            <option value="has_profile">Has Profile (displayName set)</option>
          </Select>
        </Field>
      </div>

      <Button variant="secondary" type="button" onClick={onSearch} disabled={searching}>
        {searching ? 'Searching...' : 'Search Users'}
      </Button>
    </>
  );
}

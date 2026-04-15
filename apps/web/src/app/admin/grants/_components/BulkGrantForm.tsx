'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { createBulkGrants } from '../_actions/createBulkGrants';
import { searchUsers } from '../_actions/searchUsers';
import type { ProfileStatus, SearchedUser } from '../_actions/searchUsers';

export function BulkGrantForm() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  // Filter state
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [lastSignInFrom, setLastSignInFrom] = useState('');
  const [lastSignInTo, setLastSignInTo] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('all');

  // Grant params
  const [durationDays, setDurationDays] = useState(30);
  const [reason, setReason] = useState('');

  async function handleSearch() {
    setSearching(true);
    setMessage(null);
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
      setMessage({ type: 'error', text: result.error });
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

  async function handleGrant() {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(`Grant ad_free to ${selectedIds.size} user(s). Are you sure?`);
    if (!confirmed) return;

    setGranting(true);
    setMessage(null);

    const result = await createBulkGrants({
      userIds: Array.from(selectedIds),
      durationDays,
      reason,
    });

    setGranting(false);

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    setMessage({
      type: 'success',
      text: `Granted to ${result.grantedCount} user(s) successfully`,
    });
    setUsers([]);
    setSelectedIds(new Set());
    setHasSearched(false);
    router.refresh();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-lg font-semibold">Bulk Grant</h2>

      {/* Filter form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="createdFrom" className="block text-sm font-medium mb-1">
            Registration Date (from)
          </label>
          <input
            type="date"
            id="createdFrom"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
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
            onChange={(e) => setCreatedTo(e.target.value)}
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
            onChange={(e) => setLastSignInFrom(e.target.value)}
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
            onChange={(e) => setLastSignInTo(e.target.value)}
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
            onChange={(e) => setProfileStatus(e.target.value as ProfileStatus)}
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
        onClick={handleSearch}
        disabled={searching}
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {searching ? 'Searching...' : 'Search Users'}
      </button>

      {/* Search results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">{users.length} user(s) found</p>
            {users.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-primary hover:underline"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 w-10"></th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Display Name</th>
                    <th className="px-3 py-2">Registered</th>
                    <th className="px-3 py-2">Last Sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className="border-t border-border">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.userId)}
                          onChange={() => toggleUser(user.userId)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2">{user.email ?? '-'}</td>
                      <td className="px-3 py-2">@{user.username}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.displayName ?? '(anonymous)'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('en-US')}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {user.lastSignInAt
                          ? new Date(user.lastSignInAt).toLocaleDateString('en-US')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grant params and action */}
          {users.length > 0 && (
            <div className="border-t border-border pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulkDurationDays" className="block text-sm font-medium mb-1">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    id="bulkDurationDays"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="bulkReason" className="block text-sm font-medium mb-1">
                    Reason / notification message
                  </label>
                  <input
                    type="text"
                    id="bulkReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                    placeholder="Shown to users as the notification message (e.g., 'New Year campaign')"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGrant}
                disabled={granting || selectedIds.size === 0}
                className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {granting ? 'Granting...' : `Grant to ${selectedIds.size} user(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-success-soft-foreground' : 'text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

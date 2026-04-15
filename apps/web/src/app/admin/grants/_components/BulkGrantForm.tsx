'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { useGrantBulk } from '../_hooks/useGrantBulk';
import { useUserSearch } from '../_hooks/useUserSearch';
import { BulkGrantFilterForm } from './bulk-grant-form/BulkGrantFilterForm';
import { BulkGrantParamsForm } from './bulk-grant-form/BulkGrantParamsForm';
import { BulkGrantUserTable } from './bulk-grant-form/BulkGrantUserTable';

export function BulkGrantForm() {
  const router = useRouter();
  const search = useUserSearch();
  const grant = useGrantBulk();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSearch() {
    setMessage(null);
    await search.handleSearch();
    if (search.error) {
      setMessage({ type: 'error', text: search.error });
    }
  }

  function handleGrantClick() {
    if (search.selectedIds.size === 0) return;
    setConfirmOpen(true);
  }

  async function handleGrantConfirm() {
    setConfirmOpen(false);
    setMessage(null);

    const result = await grant.submit(Array.from(search.selectedIds));

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    setMessage({
      type: 'success',
      text: `Granted to ${result.grantedCount} user(s) successfully`,
    });
    search.reset();
    router.refresh();
  }

  // Surface search error as message (handles the case where error arrives
  // after the component re-renders without a new handleSearch invocation).
  const currentMessage =
    message ?? (search.error ? { type: 'error' as const, text: search.error } : null);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-lg font-semibold">Bulk Grant</h2>

      <BulkGrantFilterForm
        createdFrom={search.createdFrom}
        createdTo={search.createdTo}
        lastSignInFrom={search.lastSignInFrom}
        lastSignInTo={search.lastSignInTo}
        profileStatus={search.profileStatus}
        searching={search.searching}
        onCreatedFromChange={search.setCreatedFrom}
        onCreatedToChange={search.setCreatedTo}
        onLastSignInFromChange={search.setLastSignInFrom}
        onLastSignInToChange={search.setLastSignInTo}
        onProfileStatusChange={search.setProfileStatus}
        onSearch={handleSearch}
      />

      {search.hasSearched && (
        <div className="space-y-4">
          <BulkGrantUserTable
            users={search.users}
            selectedIds={search.selectedIds}
            onToggleUser={search.toggleUser}
            onSelectAll={search.selectAll}
            onDeselectAll={search.deselectAll}
          />

          {search.users.length > 0 && (
            <BulkGrantParamsForm
              durationDays={grant.durationDays}
              reason={grant.reason}
              granting={grant.granting}
              selectedCount={search.selectedIds.size}
              onDurationDaysChange={grant.setDurationDays}
              onReasonChange={grant.setReason}
              onGrant={handleGrantClick}
            />
          )}
        </div>
      )}

      {currentMessage && (
        <p
          className={`text-sm ${
            currentMessage.type === 'success' ? 'text-success-soft-foreground' : 'text-destructive'
          }`}
        >
          {currentMessage.text}
        </p>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Confirm bulk grant"
        message={`Grant ad_free to ${search.selectedIds.size} user(s). Are you sure?`}
        confirmText="Grant"
        cancelText="Cancel"
        isLoading={grant.granting}
        onConfirm={handleGrantConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

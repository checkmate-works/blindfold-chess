'use client';

import { useRef, useState } from 'react';

import { banUser } from '../_actions/banUser';

export function BanButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleBan() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError('Reason is required');
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await banUser(userId, reason);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        Ban
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Ban User</h3>

            <label htmlFor={`ban-reason-${userId}`} className="block text-sm font-medium mb-2">
              Reason for ban
            </label>
            <textarea
              id={`ban-reason-${userId}`}
              ref={reasonRef}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              rows={3}
              maxLength={1000}
              placeholder="Enter reason for banning this user..."
            />

            {error && <p className="text-destructive text-sm mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBan}
                className="px-4 py-2 text-sm rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Banning...' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

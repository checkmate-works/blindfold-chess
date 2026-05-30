'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { createPointGrant } from '../_actions/createPointGrant';

/**
 * Admin form for issuing a confirmed coin grant. Mirrors GrantForm's
 * layout (UUID + amount + reason + submit) so admin muscle memory
 * transfers between the ad_free grants page and this one. "Coin" is the
 * facing name for the points ledger this writes to — see the
 * "Points / Coin Economy" note in apps/web/CLAUDE.md.
 */
export function PointGrantForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setMessage(null);

    const formData = new FormData(form);
    const result = await createPointGrant(formData);

    setPending(false);

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    // Return to the ledger view, where the just-issued grant now appears at
    // the top (createPointGrant revalidates /admin/coins).
    form.reset();
    router.push('/admin/coins');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Admin-issued coins are written as <code className="font-mono">promotional</code> and are
        immediately available to redeem.
      </p>

      <div>
        <label htmlFor="userId" className="block text-sm font-medium mb-1">
          User ID
        </label>
        <input
          type="text"
          id="userId"
          name="userId"
          required
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          placeholder="Paste user UUID"
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Amount (coins)
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          required
          min={1}
          step={1}
          defaultValue={10}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium mb-1">
          Reason (optional, recorded in moderation log)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          placeholder="e.g., Compensation for service interruption"
        />
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-success-soft-foreground' : 'text-destructive'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? 'Granting…' : 'Grant coins'}
      </button>
    </form>
  );
}

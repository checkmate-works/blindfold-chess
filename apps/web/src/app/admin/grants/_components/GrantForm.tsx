'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { BENEFIT_TYPES, type BenefitType } from '@/lib/db/data/grant-types';

import { createGrant } from '../_actions/createGrant';

/**
 * Admin-facing labels for each benefit type. The admin surface is
 * English-only by convention, so we keep these out of i18n message files
 * and let TypeScript's `Record<BenefitType, string>` enforce that every
 * benefit type listed in `BENEFIT_TYPES` has a label.
 */
const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  ad_free: 'Ad Free',
  paywall_access: 'Paywall Access',
};

export function GrantForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setMessage(null);

    const formData = new FormData(form);
    const result = await createGrant(formData);

    setPending(false);

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    setMessage({ type: 'success', text: 'Grant created successfully' });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Grant Benefit</h2>

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
        <label htmlFor="benefitType" className="block text-sm font-medium mb-1">
          Benefit Type
        </label>
        <select
          id="benefitType"
          name="benefitType"
          required
          defaultValue="ad_free"
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
        >
          {BENEFIT_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {BENEFIT_TYPE_LABELS[bt]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="durationDays" className="block text-sm font-medium mb-1">
          Duration (days)
        </label>
        <input
          type="number"
          id="durationDays"
          name="durationDays"
          required
          min={1}
          defaultValue={30}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium mb-1">
          Reason / notification message (optional)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
          placeholder="Shown to the user as the notification message (e.g., 'Compensation for outage')"
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
        {pending ? 'Creating...' : 'Create Grant'}
      </button>
    </form>
  );
}

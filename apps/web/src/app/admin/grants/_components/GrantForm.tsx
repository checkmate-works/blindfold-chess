'use client';

import { useRouter } from 'next/navigation';

import { Button, Field, FormMessage, Input, Select, Textarea } from '@/app/admin/_components/forms';
import { useAdminFormSubmit } from '@/app/admin/_hooks/useAdminFormSubmit';

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
  const { pending, message, setMessage, handleSubmit } = useAdminFormSubmit(createGrant, (form) => {
    setMessage({ type: 'success', text: 'Grant created successfully' });
    form.reset();
    router.refresh();
  });

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Grant Benefit</h2>

      <Field label="User ID" htmlFor="userId">
        <Input type="text" id="userId" name="userId" required placeholder="Paste user UUID" />
      </Field>

      <Field label="Benefit Type" htmlFor="benefitType">
        <Select id="benefitType" name="benefitType" required defaultValue="ad_free">
          {BENEFIT_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {BENEFIT_TYPE_LABELS[bt]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Duration (days)" htmlFor="durationDays">
        <Input
          type="number"
          id="durationDays"
          name="durationDays"
          required
          min={1}
          defaultValue={30}
        />
      </Field>

      <Field label="Reason / notification message (optional)" htmlFor="reason">
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          placeholder="Shown to the user as the notification message (e.g., 'Compensation for outage')"
        />
      </Field>

      <FormMessage message={message} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Grant'}
      </Button>
    </form>
  );
}

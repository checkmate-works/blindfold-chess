'use client';

import { useRouter } from 'next/navigation';

import { Button, Field, FormMessage, Input, Textarea } from '@/app/admin/_components/forms';
import { useAdminFormSubmit } from '@/app/admin/_hooks/useAdminFormSubmit';

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
  const { pending, message, handleSubmit } = useAdminFormSubmit(createPointGrant, (form) => {
    // Return to the ledger view, where the just-issued grant now appears at
    // the top (createPointGrant revalidates /admin/coins).
    form.reset();
    router.push('/admin/coins');
  });

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Admin-issued coins are written as <code className="font-mono">promotional</code> and are
        immediately available to redeem.
      </p>

      <Field label="User ID" htmlFor="userId">
        <Input type="text" id="userId" name="userId" required placeholder="Paste user UUID" />
      </Field>

      <Field label="Amount (coins)" htmlFor="amount">
        <Input
          type="number"
          id="amount"
          name="amount"
          required
          min={1}
          step={1}
          defaultValue={10}
        />
      </Field>

      <Field label="Reason (optional, recorded in moderation log)" htmlFor="reason">
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          placeholder="e.g., Compensation for service interruption"
        />
      </Field>

      <FormMessage message={message} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Granting…' : 'Grant coins'}
      </Button>
    </form>
  );
}

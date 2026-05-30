'use client';

import { Button, Field, Input } from '@/app/admin/_components/forms';

type BulkGrantParamsFormProps = {
  durationDays: number;
  reason: string;
  granting: boolean;
  selectedCount: number;
  onDurationDaysChange: (v: number) => void;
  onReasonChange: (v: string) => void;
  onGrant: () => void;
};

export function BulkGrantParamsForm({
  durationDays,
  reason,
  granting,
  selectedCount,
  onDurationDaysChange,
  onReasonChange,
  onGrant,
}: BulkGrantParamsFormProps) {
  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Duration (days)" htmlFor="bulkDurationDays">
          <Input
            type="number"
            id="bulkDurationDays"
            value={durationDays}
            onChange={(e) => onDurationDaysChange(Number(e.target.value))}
            min={1}
          />
        </Field>
        <Field label="Reason / notification message" htmlFor="bulkReason">
          <Input
            type="text"
            id="bulkReason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Shown to users as the notification message (e.g., 'New Year campaign')"
          />
        </Field>
      </div>

      <Button type="button" onClick={onGrant} disabled={granting || selectedCount === 0}>
        {granting ? 'Granting...' : `Grant to ${selectedCount} user(s)`}
      </Button>
    </div>
  );
}

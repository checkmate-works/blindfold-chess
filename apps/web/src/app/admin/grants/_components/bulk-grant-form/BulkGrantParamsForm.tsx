'use client';

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
        <div>
          <label htmlFor="bulkDurationDays" className="block text-sm font-medium mb-1">
            Duration (days)
          </label>
          <input
            type="number"
            id="bulkDurationDays"
            value={durationDays}
            onChange={(e) => onDurationDaysChange(Number(e.target.value))}
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
            onChange={(e) => onReasonChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
            placeholder="Shown to users as the notification message (e.g., 'New Year campaign')"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onGrant}
        disabled={granting || selectedCount === 0}
        className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {granting ? 'Granting...' : `Grant to ${selectedCount} user(s)`}
      </button>
    </div>
  );
}

import type { ReactNode } from 'react';

/** Label / value pair inside a `DetailSection` definition list. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground sm:w-40">{label}</dt>
      <dd className="break-all text-sm text-foreground">{children}</dd>
    </div>
  );
}

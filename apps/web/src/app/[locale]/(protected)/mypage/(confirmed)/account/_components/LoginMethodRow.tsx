import type { ReactNode } from 'react';

type Props = {
  /** The method's name ("Google account", …). */
  title: string;
  /** State or the linked account's address ("Set", "a@gmail.com"). */
  detail?: string;
  /** A note under the row, e.g. why the action is unavailable. */
  note?: string;
  /** The single button at the right edge. */
  action: ReactNode;
};

/**
 * One login method: name and state on the left, one action on the right,
 * an optional note underneath. Rows are stacked inside a bordered card and
 * separated by `divide-y` from the parent.
 */
export function LoginMethodRow({ title, detail, note, action }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          {detail !== undefined && (
            <span className="mt-0.5 block break-all text-xs text-muted-foreground">{detail}</span>
          )}
        </span>
        <span className="shrink-0">{action}</span>
      </div>
      {note !== undefined && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
      )}
    </div>
  );
}

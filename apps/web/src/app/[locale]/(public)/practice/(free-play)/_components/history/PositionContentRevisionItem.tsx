import { getTranslations } from 'next-intl/server';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';
import { buildProfileHref } from '@/lib/users/author-profile';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { formatSolutionMovesForDisplay } from './format-solution-moves';

type Props = {
  changes: Record<string, { from: unknown; to: unknown }>;
  createdAt: Date;
  editor: AuthorProfile | null;
  locale: string;
};

/**
 * One `position_content_revisions` row: who made the edit, when, and each
 * changed field's old → new value. Read-only — unlike
 * `PositionEditRequestItem` there is nothing to accept / reject / withdraw
 * here, this is a historical record of the owner's own edits.
 */
export async function PositionContentRevisionItem({ changes, createdAt, editor, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'practice.positionHistory' });

  const editorName = editor?.displayName ?? editor?.username ?? t('deletedEditor');
  const profileHref = buildProfileHref(editor);

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <UserAvatar
          profileHref={profileHref}
          avatarUrl={editor?.avatarUrl ?? null}
          displayName={editorName}
          locale={locale}
          size="sm"
        />
        <span className="text-xs text-muted-foreground">
          <time dateTime={createdAt.toISOString()}>
            {formatRelativeTime(createdAt, locale, t('justNow'))}
          </time>
        </span>
      </div>

      <dl className="space-y-3">
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} className="text-sm">
            <dt className="font-medium text-foreground">{fieldLabel(field, t)}</dt>
            <dd className="mt-1 space-y-1">
              <div className="rounded bg-rose-50 px-2 py-1 break-words whitespace-pre-wrap text-rose-900 line-through dark:bg-rose-900/20 dark:text-rose-200">
                {renderValue(field, change.from, t)}
              </div>
              <div className="rounded bg-emerald-50 px-2 py-1 break-words whitespace-pre-wrap text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
                {renderValue(field, change.to, t)}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations>>;

function fieldLabel(field: string, t: T): string {
  switch (field) {
    case 'fen':
      return t('fields.fen');
    case 'title':
      return t('fields.title');
    case 'description':
      return t('fields.description');
    case 'solutionMoves':
      return t('fields.solutionMoves');
    default:
      // Unknown future field: fall back to the raw key rather than hiding
      // the change — see the position_content_revisions schema `@design`
      // note on why `changes` isn't a closed set.
      return field;
  }
}

function renderValue(field: string, value: unknown, t: T): string {
  if (field === 'solutionMoves' && Array.isArray(value)) {
    const formatted = formatSolutionMovesForDisplay(value as PuzzleSolutionMove[][]);
    return formatted || t('emptyValue');
  }
  if (value == null || value === '') {
    return t('emptyValue');
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

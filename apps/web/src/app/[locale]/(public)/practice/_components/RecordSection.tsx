import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import type { ChallengeMenuType } from '@/lib/db/practice-menu-types';
import type { ScoreComparison } from '@/lib/db/score-comparison';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { deriveRecordView } from '../_lib/derive-record-view';

type Props = {
  locale: string;
  menuType: ChallengeMenuType;
  comparison: ScoreComparison;
};

/**
 * "Your record" card for a signed-in player, rendered in the slot above the
 * action buttons where guests see the sign-up banner. The result page
 * decides which of the two to mount from the server-resolved user, so the
 * block is in the HTML on first paint — never gated on a client auth
 * round-trip (which is what produced the layout shift the banner used to
 * cause).
 *
 * The card is a fixed shape on purpose: a header row, exactly three rows
 * (this run, last run, previous best), and one link row. Its `loading.tsx`
 * placeholder (`RecordSectionSkeleton`) can therefore reserve the exact
 * height without knowing whether this is the player's first run, a new
 * best, or an ordinary one — those states only swap the badge inside the
 * header row and the values inside the rows. An earlier draft stacked a
 * "first record" note and a badge as extra lines, which would have shifted
 * the buttons below on every first run.
 *
 * The change against the last run sits on the "this time" row, next to the
 * value it describes — the ticker convention (current value, then its delta).
 * A first draft put it on the "last time" row, where "▼7" read as a fact
 * about the previous run rather than this one.
 *
 * The My Records link is a centred text link with the same 📈 icon as the
 * My Records card on My Page, so the two read as the same destination. Not
 * a button: this is the moment a player is most curious about their trend,
 * and the page is otherwise buried under My Page.
 */
export async function RecordSection({ locale, menuType, comparison }: Props) {
  const t = await getTranslations({ locale, namespace: 'practice.record' });
  const view = deriveRecordView(comparison);

  const badge =
    view.status === 'new-best'
      ? { label: t('newBest'), className: 'bg-primary/10 text-primary' }
      : view.status === 'first'
        ? { label: t('firstRecord'), className: 'bg-muted text-muted-foreground' }
        : null;

  const formatScore = (score: number | undefined) =>
    score === undefined ? '—' : t('scoreValue', { score });

  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="record-section">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{t('title')}</span>
        {/* `py-0.5` keeps the pill inside the header row's `text-sm` line box
            (16px text + 4px = 20px), so its presence never changes the card
            height. */}
        {badge && (
          <span
            className={`inline-block whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t('thisTime')}</dt>
          <dd className="flex items-center gap-2 font-semibold text-foreground">
            {formatScore(view.currentScore)}
            <DiffFromLast diff={view.diffFromLast} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t('previousLast')}</dt>
          <dd className="font-semibold text-foreground">{formatScore(view.previousLastScore)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{t('previousBest')}</dt>
          <dd className="font-semibold text-foreground">{formatScore(view.previousBestScore)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-sm font-medium">
        <Link
          href={`/mypage/challenges?menu=${menuType}`}
          locale={locale}
          className={TEXT_LINK_CLASSES}
        >
          <span aria-hidden="true">📈</span> {t('viewMyRecords')}
        </Link>
      </p>
    </div>
  );
}

/**
 * Change against the last run, in the same glyphs and colours the My Records
 * dashboard uses for its period-over-period stats, so the two surfaces read
 * as one.
 */
function DiffFromLast({ diff }: { diff: number | undefined }) {
  if (diff === undefined) return null;
  if (diff === 0) return <span className="text-xs text-muted-foreground">±0</span>;
  if (diff > 0) return <span className="text-xs text-success">▲{diff}</span>;
  return <span className="text-xs text-destructive">▼{Math.abs(diff)}</span>;
}

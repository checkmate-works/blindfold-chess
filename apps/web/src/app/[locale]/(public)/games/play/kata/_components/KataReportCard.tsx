import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import type { LineMatchStatus } from '@blindfold-chess/features/chess-core';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';
import type { KataEntry } from '@/lib/repertoires/kata-report';

const STATUS_BADGE: Record<Exclude<LineMatchStatus, 'not-applicable'>, string> = {
  'in-book': 'bg-success/15 text-success',
  deviation: 'bg-destructive/15 text-destructive',
  gap: 'bg-warning/15 text-warning',
};

const STATUS_KEY: Record<Exclude<LineMatchStatus, 'not-applicable'>, string> = {
  'in-book': 'inBook',
  deviation: 'deviation',
  gap: 'gap',
};

type Props = {
  entry: KataEntry;
  locale: string;
  playerColor: 'white' | 'black';
};

/**
 * One repertoire's verdict on the kata report: name, on-kata/deviated/gap
 * badge, how far the game matched, and — when the game left the kata — the
 * board at the divergence with the played vs. prepared moves spelled out.
 */
export async function KataReportCard({ entry, locale, playerColor }: Props) {
  const t = await getTranslations({ locale, namespace: 'play' });
  const { repertoire, result } = entry;
  const status = result.status as Exclude<LineMatchStatus, 'not-applicable'>;
  const divergence = result.divergence;

  // The FEN before the diverging move carries the full-move number directly.
  const moveNo = divergence ? Number(divergence.fen.split(' ')[5]) || 1 : null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/${locale}/repertoires/${repertoire.id}`}
          className="text-base font-semibold text-foreground hover:underline"
        >
          {repertoire.name}
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
          {t(`kataPage.status.${STATUS_KEY[status]}`)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('kataPage.followedPlies', { count: result.followedPlies })}
      </p>

      {status === 'in-book' && (
        <p className="text-sm text-foreground">{t('kataPage.inBookDetail')}</p>
      )}

      {divergence && moveNo !== null && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-40 shrink-0">
            <BoardThumbnail fen={divergence.fen} flipped={playerColor === 'black'} />
          </div>
          <p className="text-sm text-foreground">
            {t(status === 'deviation' ? 'kataPage.deviationDetail' : 'kataPage.gapDetail', {
              moveNo,
              played: divergence.played,
              expected: divergence.expected.join(' / '),
            })}
          </p>
        </div>
      )}
    </div>
  );
}

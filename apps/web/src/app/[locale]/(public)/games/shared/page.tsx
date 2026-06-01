/**
 * Shared Games gallery (公開対局の一覧)
 *
 * @description
 * Public catalog of community-shared blindfold games, newest first. Each card
 * links to the game's detail page where members can give advice. Only `public`
 * games are listed; `unlisted` games are reachable by direct link only.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { listSharedGames } from '@/lib/db/games';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale }>;
};

const RESULT_BADGE: Record<'win' | 'loss' | 'draw', string> = {
  win: 'bg-success/15 text-success',
  loss: 'bg-destructive/15 text-destructive',
  draw: 'bg-warning/15 text-warning',
};

function engineLabel(kind: 'stockfish' | 'maia', elo: number): string {
  return kind === 'maia' ? `Maia ${elo}` : `Stockfish ${elo}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const title = t('list.title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/shared', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function SharedGamesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sharedGames' });

  const items = await listSharedGames();

  return (
    <PageLayout title={t('list.title')} locale={locale}>
      <p className="mb-6 text-sm text-muted-foreground">{t('list.subtitle')}</p>

      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('list.empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.id}>
              <Link
                href={`/${locale}/games/shared/${g.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 font-medium text-foreground">{g.title}</h2>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${RESULT_BADGE[g.result]}`}
                  >
                    {t(`result.${g.result}`)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{engineLabel(g.engineKind, g.engineElo)}</span>
                  <span className="tabular-nums">
                    {g.moveCount} {t('new.summary.moves')}
                  </span>
                  {g.cleanRate !== null && (
                    <span className="tabular-nums">
                      {t('detail.cleanRate')} {g.cleanRate}%
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('detail.by', { name: g.authorName ?? t('detail.guest') })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}

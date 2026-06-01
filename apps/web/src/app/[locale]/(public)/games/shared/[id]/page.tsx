/**
 * Shared Game detail (公開対局の詳細)
 *
 * @description
 * Public permalink for a published blindfold game: an inline, steppable replay
 * plus the game's metadata, the entry point for receiving advice. Loaded by
 * UUIDv7 id; only public / unlisted, non-deleted games are visible.
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getGameById } from '@/lib/db/games';
import type { GameRecord } from '@/lib/db/schema';
import { UUID_RE } from '@/lib/validations/uuid';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameReplay } from './_components/GameReplay';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

function engineLabel(game: GameRecord): string {
  const e = game.engineConfig;
  return e.kind === 'maia' ? `Maia ${e.rating}` : `Stockfish Lv ${e.skillLevel}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const detail = UUID_RE.test(id) ? await getGameById(id) : null;
  const title =
    detail?.game.title ??
    (await getTranslations({ locale, namespace: 'sharedGames' }))('detail.fallbackTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: `games/shared/${id}`, title }),
    title: resolveTitle(title, locale),
  };
}

export default async function SharedGamePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  if (!UUID_RE.test(id)) notFound();

  const detail = await getGameById(id);
  if (!detail) notFound();

  const t = await getTranslations({ locale, namespace: 'sharedGames' });
  const { game, authorName } = detail;

  const summary: { label: string; value: string }[] = [
    { label: t('new.summary.engine'), value: engineLabel(game) },
    { label: t('new.summary.result'), value: t(`result.${game.result}`) },
    { label: t('new.summary.moves'), value: String(game.moveCount) },
  ];
  if (game.cleanRate !== null) {
    summary.push({ label: t('detail.cleanRate'), value: `${game.cleanRate}%` });
  }

  return (
    <PageLayout title={game.title} locale={locale}>
      <div className="space-y-6">
        {/* Byline */}
        <p className="text-sm text-muted-foreground">
          {t('detail.by', { name: authorName ?? t('detail.guest') })}
        </p>

        {/* Replay */}
        <GameReplay
          moves={game.moves}
          startingFen={game.startingFen}
          playerColor={game.playerColor}
        />

        {/* Metadata */}
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {summary.map((s) => (
              <span key={s.label}>
                <span className="text-muted-foreground">{s.label}: </span>
                <span className="font-medium tabular-nums">{s.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Author's question / description */}
        {game.description && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{game.description}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

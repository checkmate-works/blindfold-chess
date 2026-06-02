'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { addGameChunkAction, deleteGameChunkAction } from '../_actions/game-chunks';
import { GameChunkCard } from './GameChunkCard';
import { GameChunkPicker } from './GameChunkPicker';

type Props = {
  gameId: string;
  /** Move the links are anchored to (0-based ply). */
  currentPly: number;
  /** All chunk links for the game (every move); filtered to `currentPly` here. */
  chunks: GameChunkItem[];
  /** Published chunks selectable in the picker. */
  availableChunks: ChunkOption[];
  /** Signed-in viewer id — enables linking + removing one's own links. */
  currentUserId?: string;
  /** Whether the viewer is the game's registered owner (may remove any link). */
  isGameOwner: boolean;
  locale: Locale;
};

/**
 * "Chunks that apply to this position" — a separate axis from the comment
 * thread, mirroring the puzzle/position chunk UI: search-select chunks into a
 * staging list, then SUBMIT to link them (no auto-save on select). Linked
 * chunks render as cards (→ the chunk page); a card can be removed by whoever
 * added it or by the game's owner. Optimistic + ply-scoped.
 */
export function GameChunkSection({
  gameId,
  currentPly,
  chunks: initialChunks,
  availableChunks,
  currentUserId,
  isGameOwner,
  locale,
}: Props) {
  const t = useTranslations('sharedGames.chunks');
  const [chunks, setChunks] = useState(initialChunks);
  const [staged, setStaged] = useState<ChunkOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staging is per-move; discard it when the board moves to a different ply.
  useEffect(() => {
    setStaged([]);
    setError(null);
  }, [currentPly]);

  const forPly = useMemo(() => chunks.filter((c) => c.ply === currentPly), [chunks, currentPly]);
  const excludedChunkIds = useMemo(
    () => new Set([...forPly.map((c) => c.chunkId), ...staged.map((c) => c.id)]),
    [forPly, staged]
  );

  const canRemove = (item: GameChunkItem) =>
    isGameOwner || (currentUserId !== undefined && item.suggestedById === currentUserId);

  const localizeError = (code: string): string => {
    if (code === 'already_linked') return t('errors.alreadyLinked');
    if (code === 'chunk_not_available') return t('errors.chunkNotAvailable');
    if (code === 'rateLimited') return t('errors.rateLimited');
    return t('errors.generic');
  };

  async function handleSubmit() {
    if (staged.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    const results = await Promise.all(
      staged.map((chunk) =>
        addGameChunkAction({ gameId, ply: currentPly, chunkId: chunk.id }).then((res) => ({
          chunk,
          res,
        }))
      )
    );
    setSubmitting(false);

    const linked: GameChunkItem[] = [];
    const stillStaged: ChunkOption[] = [];
    let firstError: string | null = null;
    for (const { chunk, res } of results) {
      if (res.success) {
        linked.push({
          id: res.id,
          ply: currentPly,
          chunkId: chunk.id,
          slug: chunk.slug,
          title: chunk.label,
          description: chunk.description,
          representativeFen: chunk.representativeFen,
          createdAt: new Date(res.createdAt),
          suggestedById: currentUserId ?? null,
          suggester: null,
        });
      } else {
        stillStaged.push(chunk);
        firstError ??= localizeError(res.error);
      }
    }
    if (linked.length > 0) setChunks((prev) => [...prev, ...linked]);
    setStaged(stillStaged);
    if (firstError) setError(firstError);
  }

  async function handleRemoveSaved(id: string) {
    setError(null);
    const res = await deleteGameChunkAction(id);
    if (!res.success) {
      setError(localizeError(res.error));
      return;
    }
    setChunks((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      <SectionTitle>{t('title')}</SectionTitle>

      {forPly.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {forPly.map((c) => (
            <GameChunkCard
              key={c.id}
              slug={c.slug}
              title={c.title}
              description={c.description}
              representativeFen={c.representativeFen}
              badge={t('badge')}
              locale={locale}
              onRemove={canRemove(c) ? () => handleRemoveSaved(c.id) : undefined}
              removeLabel={t('remove', { title: c.title })}
            />
          ))}
        </ul>
      )}

      {currentUserId !== undefined ? (
        <div className="space-y-3">
          <GameChunkPicker
            availableChunks={availableChunks}
            linkedChunkIds={excludedChunkIds}
            disabled={submitting}
            onSelect={(chunk) => setStaged((prev) => [...prev, chunk])}
            labels={{
              placeholder: t('placeholder'),
              noResults: t('noResults'),
              moreItemsHint: (count: number) => t('moreItemsHint', { count }),
            }}
          />

          {staged.length > 0 && (
            <>
              <ul className="space-y-2">
                {staged.map((c) => (
                  <GameChunkCard
                    key={c.id}
                    slug={c.slug}
                    title={c.label}
                    description={c.description}
                    representativeFen={c.representativeFen}
                    badge={t('badge')}
                    locale={locale}
                    onRemove={() => setStaged((prev) => prev.filter((s) => s.id !== c.id))}
                    removeLabel={t('remove', { title: c.label })}
                  />
                ))}
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={submitting}
                loading={submitting}
              >
                {submitting ? t('submitting') : t('submit', { count: staged.length })}
              </Button>
            </>
          )}
          {staged.length === 0 && error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('signInToLink')}{' '}
          <Link href={`/${locale}/sign-in`} className={TEXT_LINK_MUTED_CLASSES}>
            {t('signIn')}
          </Link>
        </p>
      )}
    </div>
  );
}

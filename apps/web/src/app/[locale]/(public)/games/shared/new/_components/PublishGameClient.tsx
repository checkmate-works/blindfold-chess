'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@/lib/games/publish-constants';
import type { Game } from '@/lib/games/saved-game-types';
import { recordSharedGame } from '@/lib/games/shared-game-store';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { publishGameAction } from '../../_actions/publish-game';

type Props = { locale: Locale };

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; kind: 'missing-id' | 'not-found' }
  | { status: 'loaded'; game: Game; gameId: string };

function engineLabel(game: Game): string {
  const e = game.engineConfig;
  return e.kind === 'maia' ? `Maia ${e.rating}` : `Stockfish Lv ${e.skillLevel}`;
}

export function PublishGameClient({ locale }: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');

  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoad({ status: 'error', kind: 'missing-id' });
      return;
    }
    let active = true;
    (async () => {
      const game = await new LocalStorageGameRepository().load(gameId);
      if (!active) return;
      if (!game) {
        setLoad({ status: 'error', kind: 'not-found' });
        return;
      }
      setLoad({ status: 'loaded', game, gameId });
      // Suggest a title the author can keep or edit.
      const suffix = game.status === 'in_progress' ? '' : ` — ${t(`result.${game.status}`)}`;
      setTitle(`${engineLabel(game)}${suffix}`);
    })();
    return () => {
      active = false;
    };
  }, [gameId, t]);

  if (load.status === 'loading') {
    return <p className="text-muted-foreground py-8 text-center">{t('new.loading')}</p>;
  }
  if (load.status === 'error') {
    const msg = load.kind === 'missing-id' ? t('new.gameIdMissing') : t('new.gameNotFound');
    return <p className="text-muted-foreground py-8 text-center">{msg}</p>;
  }

  const { game, gameId: sourceGameId } = load;
  if (game.status === 'in_progress') {
    return <p className="text-muted-foreground py-8 text-center">{t('new.notFinished')}</p>;
  }
  const result = game.status; // narrowed to win | loss | draw
  const trimmedTitle = title.trim();
  const canSubmit =
    trimmedTitle.length > 0 && trimmedTitle.length <= MAX_TITLE_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await publishGameAction({
        title: trimmedTitle,
        description: description.trim() || null,
        moves: game.moves,
        startingFen: game.startingFen ?? null,
        playerColor: game.playerColor,
        engineConfig: game.engineConfig,
        result,
        operationLogs: game.operationLogs ?? null,
        playSettings: game.gamePreferences ?? null,
      });

      if (!res.success) {
        setError(
          res.error === 'rateLimited' ? t('new.errors.rateLimited') : t('new.errors.generic')
        );
        setSubmitting(false);
        return;
      }

      // Remember this localStorage game's published copy (and, for account-less
      // authors, its manage token) so the result screen links to it instead of
      // offering to publish again.
      recordSharedGame(sourceGameId, res.id, res.manageToken);
      router.push(`/${locale}/games/shared/${res.id}`);
    } catch {
      setError(t('new.errors.generic'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle>{t('new.sectionTitle')}</SectionTitle>

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="game-title" className="block text-sm font-medium">
          {t('new.titleLabel')}
        </label>
        <input
          id="game-title"
          type="text"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('new.titlePlaceholder')}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="game-description" className="block text-sm font-medium">
          {t('new.descriptionLabel')}
        </label>
        <textarea
          id="game-description"
          value={description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('new.descriptionPlaceholder')}
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-xl font-medium"
      >
        {submitting ? t('new.submitting') : t('new.submit')}
      </Button>
    </div>
  );
}

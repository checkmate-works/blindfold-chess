'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaShareSquare } from 'react-icons/fa';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/games/saved-game-types';
import { getSharedGame } from '@/lib/games/shared-game-store';

import { GameListItemBase } from '@/app/[locale]/_components/GameListItemBase';
import { Modal } from '@/app/[locale]/_components/Modal';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = { locale: Locale };

/**
 * Shared-gallery entry point for publishing an already-finished game.
 *
 * Sits at the same slot the `/games` (mine) page gives its "New game" button,
 * but instead of starting a game it opens a picker of this browser's finished,
 * not-yet-published games (localStorage). Picking one routes to the existing
 * publish form (`/games/shared/new?gameId=…`) so title/description entry and
 * the `publishGameAction` flow are reused unchanged.
 *
 * "Eligible" = finished (`status !== 'in_progress'`) AND not already published
 * from this browser (`getSharedGame(id) === null`).
 */
export function PublishExistingGameButton({ locale }: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  // null = still loading the localStorage list; array = loaded (possibly empty).
  const [games, setGames] = useState<Game[] | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    setGames(null);
    try {
      const all = await new LocalStorageGameRepository().loadAllSorted('lastPlayed', 'desc');
      setGames(all.filter((g) => g.status !== 'in_progress' && getSharedGame(g.id) === null));
    } catch {
      setGames([]);
    }
  };

  const handleSelect = (gameId: string) => {
    setIsOpen(false);
    router.push(`/${locale}/games/shared/new?gameId=${gameId}`);
  };

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        icon={<FaShareSquare className="h-5 w-5" />}
        className="w-full touch-manipulation"
        onClick={handleOpen}
      >
        {t('list.publishExisting')}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('publishPicker.title')}
        maxWidth="max-w-lg"
        trapFocus
      >
        {games === null ? (
          <p className="text-muted-foreground py-8 text-center">{t('new.loading')}</p>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">{t('publishPicker.empty')}</p>
        ) : (
          <div className="bg-card overflow-hidden rounded-md border border-border">
            <ul>
              {games.map((game) => (
                <li key={game.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => handleSelect(game.id)}
                    className="hover:bg-muted w-full cursor-pointer text-left transition-colors"
                  >
                    <GameListItemBase game={game} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}

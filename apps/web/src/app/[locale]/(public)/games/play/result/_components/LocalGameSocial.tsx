'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { notifyGameListUpdated } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiOutlineHeart } from 'react-icons/ai';
import { FiShare2, FiTrash2 } from 'react-icons/fi';

import type { GifPreviewSource } from '@/lib/games/gif/preview-frames';
import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';

import { GameSocialFooter } from '@/app/[locale]/(public)/games/_components/GameSocialFooter';
import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import {
  EngagementCounter,
  engagementIconClass,
} from '@/app/[locale]/_components/EngagementCounter';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ShareEnableModal } from './ShareEnableModal';

type Props = {
  locale: Locale;
  /** The localStorage game id — the delete target. */
  gameId: string;
  /** The player's profile (the viewer's own), or null when signed out. */
  profile: { username?: string | null; avatarUrl?: string | null } | null;
  displayName: string;
  playedAt: Date;
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
  /** Animated GIF teaser for the share prompt — see {@link ShareEnableModal}. */
  gifPreview: GifPreviewSource | null;
};

/**
 * The result screen's copy of {@link GameSocialFooter} — the same author header
 * and like/share row the published game shows, so a player sees the layout
 * their game will have once shared.
 *
 * None of the engagement actions can do their real job yet: an unpublished game
 * has no server-side record to like, and no URL to share. Rather than hide them
 * (which would make the two screens diverge) each one opens
 * {@link ShareEnableModal} — the same "publish first" gate the Discussion tab's
 * compose CTAs use, and the only place the share pitch is made now that the
 * inline CTA card is gone. Publishing is open to everyone, anonymous and
 * provisional players included, so nothing here is auth-gated.
 *
 * The "⋯" menu is Share + Delete (the shared game's is Edit + Delete): before
 * publication there is nothing to edit, and delete drops the game from this
 * browser's list — the same local delete the games list offers.
 */
export function LocalGameSocial({
  locale,
  gameId,
  profile,
  displayName,
  playedAt,
  onShare,
  isShared,
  gifPreview,
}: Props) {
  const t = useTranslations('sharedGames');
  const tPlay = useTranslations('play');
  const router = useRouter();

  const [shareOpen, setShareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await new LocalStorageGameRepository().delete(gameId);
      notifyGameListUpdated();
      // The page's own game just went away — `replace` so Back doesn't return
      // to a result screen that can no longer load.
      router.replace(`/${locale}/games`);
    } catch {
      setPending(false);
      setError(t('detail.errors.generic'));
    }
  }

  return (
    <>
      <GameSocialFooter
        profile={profile}
        displayName={displayName}
        playedByLabel={t('detail.playedBy')}
        locale={locale}
        playedAt={playedAt}
        menu={
          <ActionsMenu ariaLabel={t('detail.moreActions')}>
            <ActionsMenuButton onClick={() => setShareOpen(true)}>
              <FiShare2 className="h-4 w-4" aria-hidden />
              {t('detail.share.menuLabel')}
            </ActionsMenuButton>
            <ActionsMenuButton
              tone="danger"
              onClick={() => {
                setError(null);
                setConfirmOpen(true);
              }}
              disabled={pending}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
              {pending ? t('detail.deleting') : t('detail.delete')}
            </ActionsMenuButton>
          </ActionsMenu>
        }
        // Same markup as LikeToggleButton's unliked state, so the row is
        // pixel-identical to the published game's before and after sharing.
        like={
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label={t('detail.like')}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <EngagementCounter
              icon={<AiOutlineHeart className={engagementIconClass()} />}
              count={0}
            />
          </button>
        }
        // Likewise for ShareMenu's labelled trigger — a plain button here,
        // since there is nothing to copy or embed until the game is published.
        share={
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label={t('detail.share.menuLabel')}
            className="inline-flex cursor-pointer items-center gap-1 text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            <FiShare2 className="h-5 w-5" aria-hidden />
            {t('detail.share.menuLabel')}
          </button>
        }
      />

      <ShareEnableModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        onShare={onShare}
        isShared={isShared}
        gifPreview={gifPreview}
      />

      <ConfirmationModal
        isOpen={confirmOpen}
        title={tPlay('result.deleteConfirmTitle')}
        message={tPlay('result.deleteConfirmBody')}
        error={error}
        confirmText={t('detail.delete')}
        cancelText={t('detail.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

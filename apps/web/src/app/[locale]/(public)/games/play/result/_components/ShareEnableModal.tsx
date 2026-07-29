'use client';

import { useId } from 'react';

import dynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaComments, FaHeart, FaLink, FaShareAlt } from 'react-icons/fa';

import type { GifPreviewSource } from '@/lib/games/gif/preview-frames';

import { CloseButton } from '@/app/[locale]/_components/CloseButton';
import { Modal } from '@/app/[locale]/_components/Modal';

// The preview pulls in the frame builder (chess-core) and the SVG board
// renderer, neither of which the result screen needs until this modal opens.
const GameGifPreview = dynamic(
  () => import('./GameGifPreview').then((m) => m.GameGifPreview),
  // Nothing to prerender: the frames are built from a localStorage game.
  { ssr: false, loading: () => <div className="mx-auto aspect-square w-full max-w-[16rem]" /> }
);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
  /**
   * Frames for the animated preview of this game's GIF. Null when there is
   * nothing to animate (an unfinished game, or one with no moves) — the pitch
   * then falls back to its feature list alone.
   */
  gifPreview: GifPreviewSource | null;
};

/**
 * The publish pitch, opened by every engagement action on the result screen
 * (like / share / the Discussion tab's compose CTAs — see {@link LocalGameSocial}
 * and {@link LocalDiscussionPanel}). A local game has no server-side record, so
 * none of those actions can do their real job until it is published; this is the
 * one place that explains what publishing is *for*.
 *
 * It leads with the animated replay because that is the only thing here a player
 * can take away and post elsewhere — so the modal plays the opening seconds of
 * the GIF *their own game* would produce ({@link GameGifPreview}), rather than
 * describing it. The file itself is generated server-side from the published
 * row, hence "publish, then download" rather than a download button here.
 *
 * Deliberately does NOT promise the Kata check: that runs off the local game
 * from the finish modal and needs no publishing, so listing it would credit
 * publishing with something the player already has.
 */
export function ShareEnableModal({ isOpen, onClose, onShare, isShared, gifPreview }: Props) {
  const t = useTranslations('play');
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="relative space-y-4">
        <CloseButton
          onClick={onClose}
          size="w-5 h-5"
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        />
        <h2 id={titleId} className="text-xl font-bold text-foreground pr-8">
          {t('result.shareTitle')}
        </h2>

        {gifPreview && (
          <div className="space-y-2">
            <GameGifPreview
              source={gifPreview.source}
              variant={gifPreview.variant}
              label={t('result.shareGifPreviewLabel')}
              playLabel={t('result.shareGifPlay')}
              pauseLabel={t('result.shareGifPause')}
            />
            <p className="text-center text-xs text-muted-foreground">
              {t('result.shareGifCaption')}
            </p>
          </div>
        )}

        <ul id={descriptionId} className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <FaShareAlt className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('result.shareUnlock.gif')}
          </li>
          <li className="flex items-start gap-2">
            <FaComments className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('result.shareUnlock.discussion')}
          </li>
          <li className="flex items-start gap-2">
            <FaHeart className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('result.shareUnlock.likes')}
          </li>
          <li className="flex items-start gap-2">
            <FaLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('result.shareUnlock.link')}
          </li>
        </ul>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={onShare}
            className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-center font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FaShareAlt className="h-4 w-4" aria-hidden />
            {isShared ? t('result.viewShared') : t('result.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

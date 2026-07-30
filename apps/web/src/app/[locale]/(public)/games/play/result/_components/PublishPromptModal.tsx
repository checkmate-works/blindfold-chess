'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';

import dynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBrain, FaComments, FaHeart, FaLink, FaShareAlt } from 'react-icons/fa';

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

type BaseProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

type Props = BaseProps &
  (
    | {
        /** Opened from a share / like action — pitches the shareable artefacts. */
        intent: 'share';
        /**
         * Frames for the animated preview of this game's GIF. Null when there
         * is nothing to animate (an unfinished game, or one with no moves) —
         * the pitch then falls back to its feature list alone.
         */
        gifPreview: GifPreviewSource | null;
      }
    | {
        /** Opened from a Discussion compose CTA — pitches the conversation. */
        intent: 'discussion';
        /**
         * Whether to promise the chunk composer. False on the opening board,
         * where the published game has no chunk composer either — see
         * `LocalDiscussionPanel`.
         */
        showChunks: boolean;
      }
  );

/**
 * The "publish this game first" prompt, in two flavours.
 *
 * A local game has no server-side record, so every engagement action on the
 * result screen — like, share, and the Discussion tab's compose CTAs — has to
 * stop and ask for a publish. What each of those players came for differs,
 * though, so the prompt argues the case they actually opened it from instead of
 * reciting one combined feature list:
 *
 * - `'share'` (share button, the "⋯" menu, like) leads with the animated
 *   replay, playing the opening seconds of the GIF *their own game* would
 *   produce ({@link GameGifPreview}) — the one thing here a player can take
 *   away and post elsewhere. The file itself is generated server-side from the
 *   published row, hence "publish, then download" rather than a download button
 *   in this modal.
 * - `'discussion'` (join the conversation, suggest a chunk) drops the GIF
 *   entirely and speaks only to the thread: a replay animation sitting between
 *   that reader and the publish button is noise.
 *
 * Neither list promises the Kata check: that runs off the local game from the
 * finish modal and needs no publishing.
 */
export function PublishPromptModal(props: Props) {
  const { isOpen, onClose, onShare, isShared } = props;
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
          {props.intent === 'share' ? t('result.shareTitle') : t('result.discussionTitle')}
        </h2>

        {props.intent === 'share' && props.gifPreview && (
          <div className="space-y-2">
            <GameGifPreview
              source={props.gifPreview.source}
              variant={props.gifPreview.variant}
              label={t('result.shareGifPreviewLabel')}
              playLabel={t('result.shareGifPlay')}
              pauseLabel={t('result.shareGifPause')}
            />
            <p className="text-center text-xs text-muted-foreground">
              {t('result.shareGifCaption')}
            </p>
          </div>
        )}

        {props.intent === 'discussion' && (
          <p className="text-sm text-muted-foreground">{t('result.discussionPrompt')}</p>
        )}

        <ul id={descriptionId} className="space-y-2 text-sm text-muted-foreground">
          {props.intent === 'share' ? (
            <>
              <UnlockedItem icon={<FaShareAlt className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}>
                {t('result.shareUnlock.gif')}
              </UnlockedItem>
              <UnlockedItem icon={<FaLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}>
                {t('result.shareUnlock.link')}
              </UnlockedItem>
              <UnlockedItem icon={<FaHeart className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}>
                {t('result.shareUnlock.likes')}
              </UnlockedItem>
            </>
          ) : (
            <>
              <UnlockedItem icon={<FaComments className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}>
                {t('result.shareUnlock.discussion')}
              </UnlockedItem>
              {props.showChunks && (
                <UnlockedItem icon={<FaBrain className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}>
                  {t('result.shareUnlock.chunks')}
                </UnlockedItem>
              )}
            </>
          )}
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

function UnlockedItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {icon}
      {children}
    </li>
  );
}

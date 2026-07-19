'use client';

import { useId } from 'react';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBook, FaBrain, FaClipboardList, FaCloudUploadAlt } from 'react-icons/fa';

import type { RankSlug } from '@/lib/db/data/ranks';
import type { GuestPromotionQualification } from '@/lib/games/guest-promotion';

import { CompactResultHeader } from '@/app/[locale]/(public)/games/play/result/_components/CompactResultHeader';
import { CloseButton } from '@/app/[locale]/_components/CloseButton';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { Modal } from '@/app/[locale]/_components/Modal';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { FinishChoiceCard } from './FinishChoiceCard';

/** Shared title/body(/perk) layout for the 4 promotion-pitch header variants. */
function PitchHeader({ title, body, perk }: { title: string; body: string; perk?: string }) {
  return (
    <>
      <p className="text-center font-semibold text-foreground">{title}</p>
      <p className="text-center text-sm text-muted-foreground">{body}</p>
      {perk && <p className="text-center text-xs text-muted-foreground">{perk}</p>}
    </>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** The player's terminal result, shown at the top of the modal. */
  result?: 'win' | 'loss' | 'draw' | null;
  /**
   * Go to the result screen — review the game, comment reflections, see stats.
   * Labelled "Game Review".
   */
  onReview: () => void;
  /**
   * Open Recall — reconstruct the whole game from memory. Labelled "Recall".
   */
  onRecall: () => void;
  /**
   * Open the Kata check — compare the game's opening against the player's
   * registered repertoires (型). Labelled "Kata".
   */
  onRepertoireCheck: () => void;
  /**
   * Whether this game has already been published/shared (from this browser).
   * When true, a small "published" mark rides in the Game Review card's
   * top-right corner so the player can see at a glance it is already shared.
   */
  published?: boolean;
  /**
   * The rank this win would earn by being published, when it would earn one.
   * Present only for a win that qualifies and a player one rung away — see
   * {@link usePublishPromotion}.
   */
  promotionRankSlug?: RankSlug | null;
  /**
   * The rank requirement this win satisfies, for a signed-out (or
   * provisional) player — see {@link useGuestPromotion}. With independent
   * rank evaluation this is a full promise: sign up, publish, and the rank
   * is granted.
   */
  guestPromotionRankSlug?: GuestPromotionQualification | null;
  /**
   * Sign-up URL for the guest pitch's primary CTA (a plain, locale-prefixed
   * /sign-up — built by the caller, since the modal doesn't know the
   * locale). Deliberately carries no `next`: the email-confirmation hop
   * makes a post-registration hand-off unreliable, so after onboarding the
   * /games publish nudge picks the funnel back up instead.
   */
  guestSignUpHref?: string;
  /** Publish this game — the promotion view's primary action. */
  onShare?: () => void;
};

/**
 * Shown when a game ends in live play, in place of the old auto-redirect to the
 * result screen. Leads with the win/loss/draw result, then offers three next
 * steps as cards — Game Review (result screen: stats + reflections), Recall
 * (memory reconstruction), and Kata (repertoire opening check) — each with a
 * help-tour explanation. Dismissing it leaves the
 * player on the finished board (reopen via the board's "Next action" button).
 *
 * When this win would earn a rank (`promotionRankSlug`), the cards give way to
 * a single call to publish. The rank is granted at publish, not at checkmate,
 * so the ordinary modal would send the player off to a screen where publishing
 * reads as an optional extra — and quietly cost them the promotion. The three
 * cards stay one click away behind "don't publish", which lands on the same
 * result screen the Game Review card does.
 *
 * For a signed-out player the server-backed promotion never fires, so a
 * purely local pitch (`guestPromotionRankSlug`) takes its place when the
 * game satisfies the 1kyu / 1dan game requirement. Registration-first: the
 * primary CTA is a plain "sign up", with anonymous publishing as the
 * secondary path and "don't publish" last. After onboarding the /games
 * publish nudge surfaces the still-unpublished game and completes the
 * promotion. 1dan is pitched as the black belt, with its ad-exemption perk
 * called out.
 */
export function GameFinishModal({
  isOpen,
  onClose,
  result,
  onReview,
  onRecall,
  onRepertoireCheck,
  published = false,
  promotionRankSlug = null,
  guestPromotionRankSlug = null,
  guestSignUpHref,
  onShare,
}: Props) {
  const t = useTranslations('play');
  const tRanks = useTranslations('ranks');
  const titleId = useId();

  // An already-published game has earned whatever it was going to earn, so the
  // nudge would be stale.
  const showPromotion = !!promotionRankSlug && !!onShare && !published;
  // The signed-out pitch — never shown alongside the signed-in promotion,
  // which makes the stronger (server-confirmed) promise.
  const showGuestPromotion =
    !showPromotion && !!guestPromotionRankSlug && !!onShare && !!guestSignUpHref && !published;

  // Flat (not nested) precomputation of the pitch header content: showPromotion
  // and showGuestPromotion are mutually exclusive (see their definitions
  // above), and each has a 1dan variant and a non-1dan variant.
  let pitchHeader: { title: string; body: string; perk?: string } | null = null;
  if (showPromotion) {
    pitchHeader =
      promotionRankSlug === '1dan'
        ? {
            title: t('finishModal.dan.title'),
            body: t('finishModal.dan.publishBody'),
            perk: t('finishModal.dan.perk'),
          }
        : {
            title: t('finishModal.promotion.title', {
              rankName: tRanks(`rankNames.${promotionRankSlug}`),
            }),
            body: t('finishModal.promotion.description'),
          };
  } else if (showGuestPromotion) {
    pitchHeader =
      guestPromotionRankSlug === '1dan'
        ? {
            title: t('finishModal.dan.title'),
            body: t('finishModal.dan.signUpBody'),
            perk: t('finishModal.dan.perk'),
          }
        : {
            title: t('finishModal.guestPromotion.title1kyu'),
            body: t('finishModal.guestPromotion.body1kyu'),
          };
  }

  const skipButton = (
    <button type="button" onClick={onReview} className={`text-sm ${TEXT_LINK_CLASSES}`}>
      {t('finishModal.promotion.skip')}
    </button>
  );

  const tourSteps: HelpStep[] = [
    {
      targetId: 'finish-card-review',
      title: t('finishModal.review.title'),
      description: t('finishModal.review.description'),
    },
    {
      targetId: 'finish-card-recall',
      title: t('finishModal.recall.title'),
      description: t('finishModal.recall.description'),
    },
    {
      targetId: 'finish-card-repertoire-check',
      title: t('finishModal.repertoireCheck.title'),
      description: t('finishModal.repertoireCheck.description'),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" aria-labelledby={titleId}>
      <div className="relative space-y-4">
        <CloseButton
          onClick={onClose}
          size="w-5 h-5"
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        />

        <div id={titleId} className="flex flex-col items-center gap-2 pr-8">
          {result && <CompactResultHeader result={result} />}
          {pitchHeader ? (
            <PitchHeader {...pitchHeader} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('finishModal.title')}</span>
              <HelpTourButton steps={tourSteps} label={t('finishModal.help')} />
            </div>
          )}
        </div>

        {showGuestPromotion ? (
          <div className="flex flex-col items-center gap-3">
            {/* Both actions full-width at matching heights — mismatched
                widths/heights read as visual noise in a stacked pair. */}
            <Link
              href={guestSignUpHref!}
              className="w-full rounded-md border border-transparent bg-primary px-4 py-2.5 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('finishModal.guestPromotion.signUp')}
            </Link>
            <button
              type="button"
              onClick={onShare}
              className="w-full rounded-md border border-border px-4 py-2.5 text-center font-semibold text-foreground transition-colors hover:border-foreground/30"
            >
              {t('finishModal.guestPromotion.publishAnonymously')}
            </button>
            {skipButton}
          </div>
        ) : showPromotion ? (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onShare}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:px-8"
            >
              {t('finishModal.promotion.publish')}
            </button>
            {skipButton}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FinishChoiceCard
              tourId="finish-card-review"
              icon={<FaClipboardList aria-hidden />}
              title={t('finishModal.review.title')}
              description={t('finishModal.review.description')}
              onClick={onReview}
              badge={
                published ? (
                  <span
                    title={t('finishModal.publishedBadge')}
                    className="inline-flex items-center rounded-full bg-success/15 p-1 text-success"
                  >
                    <FaCloudUploadAlt className="h-3 w-3" aria-hidden />
                    <span className="sr-only">{t('finishModal.publishedBadge')}</span>
                  </span>
                ) : undefined
              }
            />
            <FinishChoiceCard
              tourId="finish-card-recall"
              icon={<FaBrain aria-hidden />}
              title={t('finishModal.recall.title')}
              description={t('finishModal.recall.description')}
              onClick={onRecall}
            />
            <FinishChoiceCard
              tourId="finish-card-repertoire-check"
              icon={<FaBook aria-hidden />}
              title={t('finishModal.repertoireCheck.title')}
              description={t('finishModal.repertoireCheck.description')}
              onClick={onRepertoireCheck}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

'use client';

import { memo } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiTrash2 } from 'react-icons/fi';

import { buildProfileHref } from '@/lib/users/author-profile';
import { resolveAuthorName } from '@/lib/users/display-name';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';
import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ActivityCard } from '@/app/[locale]/_components/ActivityCard';
import { CardAuthorAvatar } from '@/app/[locale]/_components/CardAuthorAvatar';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { EngagementCounterSize } from '@/app/[locale]/_components/EngagementCounter';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';
import { CARD_PERMALINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import {
  deleteJoinAnnouncementAction,
  toggleJoinAnnouncementLikeAction,
} from '../_actions/joinAnnouncement';
import type { MemberJoinedFeedData } from '../_lib/types';

type Props = {
  feedItemId: string;
  data: MemberJoinedFeedData;
  createdAt: string;
  locale: string;
  justNowLabel: string;
  actionSize?: EngagementCounterSize;
  /** Called after the owner deletes the card, so the list can drop it. */
  onRemoved?: () => void;
};

/**
 * Feed card for a new member's arrival announcement. The whole card opens the
 * member's profile (where the bio lives); the footer carries a like button
 * and, for the member themself, a "⋯" menu to delete the card.
 */
export const MemberJoinedCard = memo(function MemberJoinedCard({
  feedItemId,
  data,
  createdAt,
  locale,
  justNowLabel,
  actionSize,
  onRemoved,
}: Props) {
  const t = useTranslations('memberJoinedCard');
  const displayName = resolveAuthorName(data.member, { fallback: data.member.username });
  const href = buildProfileHref(data.member);
  const { isOpen, open, cancel, isPending, error, run } = useConfirmAction();

  function handleConfirmDelete() {
    return run(
      () => deleteJoinAnnouncementAction(feedItemId),
      (result) => ('error' in result ? t('delete.error') : null),
      () => onRemoved?.()
    );
  }

  return (
    <>
      <ActivityCard
        href={href}
        locale={locale}
        thumbnail={<MemberJoinedThumbnail />}
        thumbnailClassName="flex items-center justify-center"
        author={<CardAuthorAvatar author={data.member} displayName={displayName} locale={locale} />}
        permalink={
          href ? (
            <Link href={href} locale={locale} className={CARD_PERMALINK_CLASSES}>
              <time dateTime={createdAt}>
                {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
              </time>
            </Link>
          ) : null
        }
        footer={
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <LikeButton
              postId={feedItemId}
              locale={locale}
              topicKey=""
              initialLikeCount={data.likeMeta.likeCount}
              initialLikedByMe={data.likeMeta.likedByMe}
              toggleLikeAction={toggleJoinAnnouncementLikeAction}
              i18nNamespace="memberJoinedCard"
              size={actionSize}
            />
            {data.isMine && (
              <div className="ml-auto">
                <ActionsMenu ariaLabel={t('moreActions')}>
                  <ActionsMenuButton tone="danger" onClick={open} disabled={isPending}>
                    <FiTrash2 className="h-4 w-4" aria-hidden />
                    {t('delete.button')}
                  </ActionsMenuButton>
                </ActionsMenu>
              </div>
            )}
          </div>
        }
      >
        <p className="text-sm text-foreground mt-1">{t('action')}</p>
      </ActivityCard>
      {data.isMine && (
        <ConfirmationModal
          isOpen={isOpen}
          title={t('delete.title')}
          message={t('delete.message')}
          error={error}
          confirmText={t('delete.confirm')}
          cancelText={t('delete.cancel')}
          confirmVariant="danger"
          isLoading={isPending}
          onConfirm={handleConfirmDelete}
          onCancel={cancel}
        />
      )}
    </>
  );
});

/**
 * The card exactly as it will appear on the home feed, for the onboarding
 * step that asks whether to post it. Rendered `inert`: its avatar would
 * otherwise link away from the wizard mid-step, and its like button has no
 * feed row to act on yet. The like count shows 0 so the member can see the
 * card will take likes.
 */
export function MemberJoinedCardPreview({
  member,
  locale,
  justNowLabel,
}: {
  member: MemberJoinedFeedData['member'];
  locale: string;
  justNowLabel: string;
}) {
  const t = useTranslations('memberJoinedCard');
  const displayName = resolveAuthorName(member, { fallback: member.username });

  return (
    <div inert className="rounded-md border border-border bg-card">
      <ActivityCard
        thumbnail={<MemberJoinedThumbnail />}
        thumbnailClassName="flex items-center justify-center"
        author={<CardAuthorAvatar author={member} displayName={displayName} locale={locale} />}
        permalink={<span>{justNowLabel}</span>}
        footer={
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <LikeButton
              postId=""
              locale={locale}
              topicKey=""
              initialLikeCount={0}
              initialLikedByMe={false}
              toggleLikeAction={previewToggleLike}
              i18nNamespace="memberJoinedCard"
            />
          </div>
        }
      >
        <p className="text-sm text-foreground mt-1">{t('action')}</p>
      </ActivityCard>
    </div>
  );
}

/** Never called — the preview is `inert` — but `LikeButton` requires one. */
async function previewToggleLike() {
  return { liked: false, likeCount: 0 };
}

function MemberJoinedThumbnail() {
  return (
    <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted text-3xl sm:text-4xl">
      <span aria-hidden>{'\u{1F44B}'}</span>
    </div>
  );
}

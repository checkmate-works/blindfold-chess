'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GameChunkItem } from '@/lib/db/game-chunks';

import { formatAbsoluteDateTime } from '@/app/[locale]/(public)/topics/_lib/absolute-time';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkRefLink } from './ChunkRefLink';

type Props = {
  /** A run of consecutive links by the same suggester (non-empty). */
  items: GameChunkItem[];
  badge: string;
  /**
   * Badge substituted for `badge` on links pointing at a draft chunk. A
   * draft's title is still open to renegotiation, so the card says so
   * rather than presenting it as a settled catalog entry.
   */
  draftBadge: string;
  locale: Locale;
  /** Whether the viewer may unlink a given link (owner / the suggester). */
  canRemove: (item: GameChunkItem) => boolean;
  /** Unlink a chunk; resolves with a localized `error` on failure. */
  onRemove: (item: GameChunkItem) => Promise<{ error?: string }>;
};

/**
 * A run of chunk links by one suggester, rendered in the exact comment-card
 * layout (see `GameCommentNode`) so it lines up with the advice thread: a
 * leading spacer matching a comment's collapse button keeps the content column
 * aligned; the suggester's avatar + name and the timestamp-only meta line
 * mirror a comment header; a muted "linked N chunks" system line sits where the
 * comment body would; then each chunk reference card (with a Delete affordance
 * below it, when permitted) sits where an attachment would. Like / reply do not
 * apply, so they are absent. Grouping keeps one person's batch of links to a
 * single header instead of repeating the avatar per link.
 */
export function GameChunkLinkCard({
  items,
  badge,
  draftBadge,
  locale,
  canRemove,
  onRemove,
}: Props) {
  const t = useTranslations('sharedGames');
  const tCommon = useTranslations('Common');

  // The chunk pending unlink-confirmation, plus the modal's loading / error.
  const [deleteTarget, setDeleteTarget] = useState<GameChunkItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await onRemove(deleteTarget);
    setDeletePending(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
  }

  // The run shares a suggester; the header reads from the first, the timestamp
  // from the most recent link in the run.
  const head = items[0];
  const latest = items[items.length - 1];
  const displayName =
    head.suggester?.displayName || head.suggester?.username || tCommon('deletedUser');
  const profileHref = head.suggester?.username ? `/u/${head.suggester.username}` : null;

  return (
    <li id={`game-chunk-${head.id}`} className="scroll-mt-20">
      <div className="flex items-start gap-2">
        {/* Spacer matching a comment root's collapse (+/−) button, so the
            content column aligns with the comment thread. */}
        <div className="mt-1 h-5 w-5 flex-shrink-0" aria-hidden />

        <div className="min-w-0 flex-1 space-y-2">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={head.suggester?.avatarUrl}
            displayName={displayName}
            locale={locale}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <time dateTime={latest.createdAt.toISOString()}>
                {formatAbsoluteDateTime(latest.createdAt, locale, 'short')}
              </time>
            </div>
          </UserAvatar>

          {/* System-generated line (not a user-authored body) — muted to
              distinguish it from an actual comment. */}
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {t('chunks.linkedAction', { count: items.length })}
          </p>

          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="space-y-1">
                <ChunkRefLink
                  slug={item.slug}
                  title={item.title}
                  description={item.description}
                  representativeFen={item.representativeFen}
                  badge={item.status === 'draft' ? draftBadge : badge}
                  locale={locale}
                />
                {canRemove(item) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(item);
                    }}
                    aria-label={t('chunks.remove', { title: item.title })}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    {t('chunks.delete')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title={t('chunks.confirmUnlinkTitle')}
        message={t('chunks.confirmUnlinkBody')}
        confirmText={t('chunks.delete')}
        cancelText={t('chunks.confirmCancel')}
        confirmVariant="danger"
        isLoading={deletePending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </li>
  );
}

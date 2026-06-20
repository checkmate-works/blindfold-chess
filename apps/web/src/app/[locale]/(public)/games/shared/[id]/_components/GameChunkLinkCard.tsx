'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { GameChunkItem } from '@/lib/db/game-chunks';

import { formatAbsoluteDateTime } from '@/app/[locale]/(public)/topics/_lib/absolute-time';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChunkRefLink } from './ChunkRefLink';

type Props = {
  item: GameChunkItem;
  badge: string;
  locale: Locale;
  /** Whether the viewer may unlink this chunk (owner / the suggester). */
  canRemove: boolean;
  onRemove: () => void;
};

/**
 * A posted chunk link, rendered in the exact comment-card layout (see
 * `GameCommentNode`) so it lines up with the advice thread: a leading spacer
 * matching a comment's collapse button keeps the content column aligned; the
 * suggester's avatar + name and the timestamp-only meta line mirror a comment
 * header; "linked a chunk" sits where the comment body would; the chunk
 * reference card sits where an attachment would; and Delete sits in the
 * comment-action row. Like / reply do not apply to a link, so they are absent.
 */
export function GameChunkLinkCard({ item, badge, locale, canRemove, onRemove }: Props) {
  const t = useTranslations('sharedGames');
  const tCommon = useTranslations('Common');

  const displayName =
    item.suggester?.displayName || item.suggester?.username || tCommon('deletedUser');
  const profileHref = item.suggester?.username ? `/u/${item.suggester.username}` : null;

  return (
    <li id={`game-chunk-${item.id}`} className="scroll-mt-20">
      <div className="flex items-start gap-2">
        {/* Spacer matching a comment root's collapse (+/−) button, so the
            content column aligns with the comment thread. */}
        <div className="mt-1 h-5 w-5 flex-shrink-0" aria-hidden />

        <div className="min-w-0 flex-1 space-y-2">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={item.suggester?.avatarUrl}
            displayName={displayName}
            locale={locale}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <time dateTime={item.createdAt.toISOString()}>
                {formatAbsoluteDateTime(item.createdAt, locale, 'short')}
              </time>
            </div>
          </UserAvatar>

          <p className="text-sm text-foreground leading-relaxed">{t('chunks.linkedAction')}</p>

          <ChunkRefLink
            slug={item.slug}
            title={item.title}
            description={item.description}
            representativeFen={item.representativeFen}
            badge={badge}
            locale={locale}
          />

          {canRemove && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onRemove}
                aria-label={t('chunks.remove', { title: item.title })}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                {t('chunks.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

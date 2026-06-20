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
 * A posted chunk link, rendered in the comment-card idiom so it reads on the
 * same axis as the advice thread: the suggester's avatar + name (same
 * `UserAvatar` as a comment), a "linked a chunk" line with the timestamp, the
 * chunk reference card, and — when permitted — a Delete affordance in the same
 * position as a comment's. Like / reply do not apply to a link, so they are
 * intentionally absent.
 */
export function GameChunkLinkCard({ item, badge, locale, canRemove, onRemove }: Props) {
  const t = useTranslations('sharedGames');
  const tCommon = useTranslations('Common');

  const displayName =
    item.suggester?.displayName || item.suggester?.username || tCommon('deletedUser');
  const profileHref = item.suggester?.username ? `/u/${item.suggester.username}` : null;

  return (
    <li className="scroll-mt-20 space-y-2">
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={item.suggester?.avatarUrl}
        displayName={displayName}
        locale={locale}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{t('chunks.linkedAction')}</span>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>
          <time dateTime={item.createdAt.toISOString()}>
            {formatAbsoluteDateTime(item.createdAt, locale, 'short')}
          </time>
        </div>
      </UserAvatar>

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
    </li>
  );
}

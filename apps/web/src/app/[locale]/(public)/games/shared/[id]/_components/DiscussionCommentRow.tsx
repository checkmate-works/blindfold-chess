'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { buildProfileHref } from '@/lib/users/author-profile';

import { formatAbsoluteDateTime } from '@/app/[locale]/(public)/topics/_lib/absolute-time';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type GameCommentTreeNode, countDescendants } from '../_lib/game-comment-tree';
import { GameCommentBody } from './GameCommentBody';

type Props = {
  node: GameCommentTreeNode;
  locale: Locale;
  moves: string[];
  startingFen: string | null;
  playerColor: Side;
};

/**
 * A read-only rendering of a comment root for the overview discussion feed —
 * the same avatar + timestamp + body chrome as `GameCommentNode`, minus every
 * interactive affordance (like / reply / edit / delete / collapse). Replies are
 * summarized as a count; acting on the thread happens after jumping to the move.
 */
export function DiscussionCommentRow({ node, locale, moves, startingFen, playerColor }: Props) {
  const t = useTranslations('sharedGames');
  const tCommon = useTranslations('Common');

  const displayName = node.author?.displayName || node.author?.username || tCommon('deletedUser');
  const profileHref = buildProfileHref(node.author);
  const replyCount = countDescendants(node);

  return (
    <div className="space-y-2">
      <UserAvatar
        profileHref={profileHref}
        avatarUrl={node.author?.avatarUrl}
        displayName={displayName}
        locale={locale}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <time dateTime={node.createdAt.toISOString()}>
            {formatAbsoluteDateTime(node.createdAt, locale, 'short')}
          </time>
        </div>
      </UserAvatar>

      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
        <GameCommentBody
          text={node.body}
          locale={locale}
          moves={moves}
          startingFen={startingFen}
          playerColor={playerColor}
        />
      </p>

      {replyCount > 0 && (
        <p className="text-xs text-muted-foreground italic">
          {t('discussion.replies', { count: replyCount })}
        </p>
      )}
    </div>
  );
}

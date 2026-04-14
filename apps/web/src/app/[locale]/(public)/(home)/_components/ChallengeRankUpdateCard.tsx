'use client';

import { memo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getMedalEmoji } from '@/lib/rank-emoji';

import { getLeaderboardIcon } from '@/app/[locale]/(public)/leaderboard/_lib/icons';
import {
  type LeaderboardModule,
  moduleToSlug,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import type { ChallengeRankUpdateData } from '../_lib/types';
import { FeedItemCard } from './FeedItemCard';

// ---------------------------------------------------------------------------
// Rank → Emoji mapping (ranks 4–10 are local to this card)
// ---------------------------------------------------------------------------

const RANK_EMOJI: Record<number, string> = {
  4: '4\uFE0F\u20E3',
  5: '5\uFE0F\u20E3',
  6: '6\uFE0F\u20E3',
  7: '7\uFE0F\u20E3',
  8: '8\uFE0F\u20E3',
  9: '9\uFE0F\u20E3',
  10: '\u{1F51F}',
};

function getRankEmoji(rank: number): string | null {
  return getMedalEmoji(rank) ?? RANK_EMOJI[rank] ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  data: ChallengeRankUpdateData;
  createdAt: string;
  locale: string;
  justNowLabel: string;
};

export const ChallengeRankUpdateCard = memo(function ChallengeRankUpdateCard({
  data,
  createdAt,
  locale,
  justNowLabel,
}: Props) {
  const tFeed = useTranslations('home.feed.rankUpdate');
  const tLeaderboard = useTranslations('leaderboard');
  const displayName = data.actor.displayName || data.actor.username;
  const moduleSlug = moduleToSlug(data.menuType as LeaderboardModule);
  const href = `/leaderboard/score/all-time/${moduleSlug}/${data.leaderboardKey}`;
  const moduleName = tLeaderboard(`module.${data.menuType}` as Parameters<typeof tLeaderboard>[0]);

  const label =
    data.leaderboardKey === 'default'
      ? moduleName
      : `${moduleName} — ${tLeaderboard(`setting.${data.menuType}.${data.leaderboardKey}` as Parameters<typeof tLeaderboard>[0])}`;

  const rankEmoji = getRankEmoji(data.rank);

  const icon = getLeaderboardIcon(data.menuType as LeaderboardModule, data.leaderboardKey, 'lg');

  const thumbnail = (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted">
        {icon}
      </div>
      <span className="absolute right-0 bottom-0 z-10 text-lg sm:text-xl">{'\u{1F3C6}'}</span>
    </div>
  );

  return (
    <FeedItemCard
      href={href}
      locale={locale}
      thumbnail={thumbnail}
      thumbnailClassName="flex items-center justify-center"
    >
      <UserAvatar
        profileHref={null}
        avatarUrl={data.actor.avatarUrl}
        displayName={displayName}
        locale={locale}
        size="sm"
        flair={data.actor.flair}
        country={data.actor.country}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={createdAt}>
          {formatRelativeTime(new Date(createdAt), locale, justNowLabel)}
        </time>
      </div>
      <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
        {label}
      </span>
      <p className="text-sm text-foreground mt-1">
        {data.isNewEntry ? tFeed('newEntry') : tFeed('improved')}
        {rankEmoji && <span className="ml-1">{rankEmoji}</span>}
      </p>
    </FeedItemCard>
  );
});

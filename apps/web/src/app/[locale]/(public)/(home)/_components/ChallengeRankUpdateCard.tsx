'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import {
  type LeaderboardModule,
  moduleToSlug,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { UserAvatar } from '@/app/[locale]/(public)/topics/_components/UserAvatar';
import { formatRelativeTime } from '@/app/[locale]/(public)/topics/_lib/relative-time';

import type { ChallengeRankUpdateData } from '../_lib/types';

// ---------------------------------------------------------------------------
// Rank → Emoji mapping
// ---------------------------------------------------------------------------

const RANK_EMOJI: Record<number, string> = {
  1: '\u{1F947}',
  2: '\u{1F948}',
  3: '\u{1F949}',
  4: '4\uFE0F\u20E3',
  5: '5\uFE0F\u20E3',
  6: '6\uFE0F\u20E3',
  7: '7\uFE0F\u20E3',
  8: '8\uFE0F\u20E3',
  9: '9\uFE0F\u20E3',
  10: '\u{1F51F}',
};

function getRankEmoji(rank: number): string | null {
  return RANK_EMOJI[rank] ?? null;
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

export function ChallengeRankUpdateCard({ data, createdAt, locale, justNowLabel }: Props) {
  const tFeed = useTranslations('home.feed.rankUpdate');
  const tLeaderboard = useTranslations('leaderboard');
  const displayName = data.actor.displayName || data.actor.username;
  const moduleSlug = moduleToSlug(data.menuType as LeaderboardModule);
  const href = `/leaderboard/all-time/${moduleSlug}/${data.leaderboardKey}`;
  const moduleName = tLeaderboard(`module.${data.menuType}` as Parameters<typeof tLeaderboard>[0]);

  const label =
    data.leaderboardKey === 'default'
      ? moduleName
      : `${moduleName} — ${tLeaderboard(`setting.${data.menuType}.${data.leaderboardKey}` as Parameters<typeof tLeaderboard>[0])}`;

  const rankEmoji = getRankEmoji(data.rank);

  return (
    <Link
      href={href}
      locale={locale}
      className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center text-4xl sm:text-5xl">
        {'\u{1F3C6}'}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
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
          {rankEmoji && <span className="mr-1">{rankEmoji}</span>}
        </p>
      </div>
    </Link>
  );
}

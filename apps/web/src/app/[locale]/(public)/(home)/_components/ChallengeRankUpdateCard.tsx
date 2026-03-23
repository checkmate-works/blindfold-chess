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
// SVG Icons
// ---------------------------------------------------------------------------

function PodiumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 60" fill="none" className={className} aria-hidden="true">
      {/* Star above 1st place */}
      <path
        d="M32 2l2.2 4.5 5 .7-3.6 3.5.8 5L32 13.2l-4.4 2.5.8-5-3.6-3.5 5-.7z"
        fill="#fbbf24"
        stroke="#ca8a04"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {/* 2nd place — silver */}
      <rect x={3} y={26} width={18} height={30} rx={1.5} fill="#e5e7eb" />
      <rect x={3} y={26} width={18} height={30} rx={1.5} fill="#d1d5db" opacity={0.5} />
      <rect
        x={3}
        y={26}
        width={18}
        height={30}
        rx={1.5}
        stroke="#9ca3af"
        strokeWidth={1.2}
        fill="none"
      />
      <text
        x={12}
        y={45}
        textAnchor="middle"
        fill="#4b5563"
        fontSize={13}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        2
      </text>
      {/* 1st place — gold */}
      <rect x={22} y={18} width={20} height={38} rx={1.5} fill="#fde68a" />
      <rect x={22} y={18} width={20} height={38} rx={1.5} fill="#fbbf24" opacity={0.5} />
      <rect
        x={22}
        y={18}
        width={20}
        height={38}
        rx={1.5}
        stroke="#ca8a04"
        strokeWidth={1.2}
        fill="none"
      />
      <text
        x={32}
        y={41}
        textAnchor="middle"
        fill="#78350f"
        fontSize={13}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        1
      </text>
      {/* 3rd place — bronze */}
      <rect x={43} y={34} width={18} height={22} rx={1.5} fill="#fed7aa" />
      <rect x={43} y={34} width={18} height={22} rx={1.5} fill="#fb923c" opacity={0.45} />
      <rect
        x={43}
        y={34}
        width={18}
        height={22}
        rx={1.5}
        stroke="#ea580c"
        strokeWidth={1.2}
        fill="none"
      />
      <text
        x={52}
        y={49}
        textAnchor="middle"
        fill="#7c2d12"
        fontSize={13}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        3
      </text>
      {/* Base line */}
      <line
        x1={1}
        y1={57}
        x2={63}
        y2={57}
        stroke="#9ca3af"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.5}
      />
    </svg>
  );
}

function MedalIcon({ rank, className }: { rank: number; className?: string }) {
  const colors = {
    1: { outer: '#fbbf24', inner: '#fde68a', ring: '#ca8a04', text: '#78350f', leaf: '#ca8a04' },
    2: { outer: '#d1d5db', inner: '#f3f4f6', ring: '#6b7280', text: '#374151', leaf: '#9ca3af' },
    3: { outer: '#fb923c', inner: '#fed7aa', ring: '#ea580c', text: '#7c2d12', leaf: '#ea580c' },
  }[rank] ?? {
    outer: '#d1d5db',
    inner: '#f3f4f6',
    ring: '#6b7280',
    text: '#374151',
    leaf: '#9ca3af',
  };

  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Outer medal disc */}
      <circle cx={16} cy={16} r={14} fill={colors.outer} />
      {/* Inner lighter disc */}
      <circle cx={16} cy={16} r={10.5} fill={colors.inner} />
      {/* Decorative ring */}
      <circle cx={16} cy={16} r={10.5} fill="none" stroke={colors.ring} strokeWidth={1} />
      {/* Laurel leaf accents — left */}
      <path
        d="M8 22c1.5-3 2-6.5 0-10"
        stroke={colors.leaf}
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
        opacity={0.5}
      />
      <path
        d="M9.5 21c1-2.5 1.5-5.5 0-8.5"
        stroke={colors.leaf}
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.35}
      />
      {/* Laurel leaf accents — right */}
      <path
        d="M24 22c-1.5-3-2-6.5 0-10"
        stroke={colors.leaf}
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
        opacity={0.5}
      />
      <path
        d="M22.5 21c-1-2.5-1.5-5.5 0-8.5"
        stroke={colors.leaf}
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.35}
      />
      {/* Rank number */}
      <text
        x={16}
        y={21}
        textAnchor="middle"
        fill={colors.text}
        fontSize={14}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
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

  const isPodium = data.rank >= 1 && data.rank <= 3;

  return (
    <Link
      href={href}
      locale={locale}
      className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center">
        <PodiumIcon className="w-12 h-12 sm:w-14 sm:h-14" />
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
        <p className="text-sm font-medium text-foreground mt-1">
          {data.isNewEntry ? tFeed('newEntry') : tFeed('improved')}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            {isPodium ? (
              <MedalIcon rank={data.rank} className="w-8 h-8" />
            ) : (
              <>
                <span className="text-xs">{tFeed('rank')}:</span>
                <span className="font-medium text-foreground">{data.rank}</span>
              </>
            )}
          </span>
          <span>
            {tFeed('score')}: {data.score}
          </span>
        </div>
      </div>
    </Link>
  );
}

'use client';

import { type ReactNode, useMemo } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { BoardFrame, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { ChessBoardWithOverlay } from '@/app/[locale]/(public)/practice/(free-play)/_components/ChessBoardWithOverlay';
import { ResultLikeCta } from '@/app/[locale]/(public)/practice/(free-play)/_components/ResultLikeCta';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { ExpGainDisplay } from '@/app/[locale]/(public)/practice/_components/ExpGainDisplay';
import { SegmentedProgressBar } from '@/app/[locale]/(public)/practice/_components/SegmentedProgressBar';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { CardLink, Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { calculateSquareDifferences } from '../../_lib/preset-problems';
import { parseResults, parseStats } from '../../_lib/result-serde';
import type { PositionAccuracy } from '../../_lib/types';

type ProfileLike = {
  username?: string | null;
  avatarUrl?: string | null;
} | null;

type Props = {
  locale: Locale;
  /**
   * Locale-relative session route the "try again" button restarts (without
   * query), e.g. `/practice/position-memory/<id>/session` or
   * `/practice/position-memory/custom/<token>/session`. Decouples this view
   * from whether the run came from a saved position or an instant one.
   */
  sessionPath: string;
  adBannerStandard?: ReactNode;
  breadcrumb?: ReactNode;
  expInfo?: ExpInfo | null;
  /**
   * The saved position's id/author, for the like CTA + Created-by row.
   * Undefined for runs with no backing DB position (e.g. the token-based
   * `custom/[token]/result` route), in which case that whole block is
   * omitted — there's no position to like or attribute.
   */
  positionId?: string;
  profile?: ProfileLike;
  displayName?: string;
  initialLikeCount?: number;
  initialLikedByMe?: boolean;
};

export function SinglePositionResult({
  locale,
  sessionPath,
  adBannerStandard,
  breadcrumb,
  expInfo,
  positionId,
  profile,
  displayName,
  initialLikeCount,
  initialLikedByMe,
}: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('practice.positionMemory');
  const { preferences } = useGamePreferences();

  const score = parseFloat(searchParams.get('score') || '0');
  const timeLimit = searchParams.get('timeLimit') || '30';

  const resultItem = useMemo(() => {
    const parsed = parseResults(searchParams.get('data'));
    return parsed.length > 0 ? parsed[0] : null;
  }, [searchParams]);
  const stats = useMemo(() => parseStats(searchParams.get('stats')), [searchParams]);

  const squareDifferences = useMemo(() => {
    if (!resultItem) return [];
    return calculateSquareDifferences(resultItem.fen, resultItem.recreatedFen);
  }, [resultItem]);

  const isBlackToMove = resultItem ? resultItem.isBlackToMove : false;
  const isSkipped = resultItem ? resultItem.skipped : false;

  const accuracy: PositionAccuracy | null = stats
    ? {
        correctPieces: stats.correctPieces,
        totalPieces: stats.totalPieces,
        incorrectPieces: stats.incorrectPieces,
        missingPieces: stats.missingPieces,
        extraPieces: stats.extraPieces,
        netScore: stats.correctPieces - (stats.incorrectPieces + stats.extraPieces) * 0.5,
        accuracy: score,
        details: [],
      }
    : null;

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <div className="space-y-6">
          <SectionTitle>{t('result')}</SectionTitle>

          {/* Accuracy Title */}
          <h2 className="text-2xl font-bold text-center">
            {t('accuracy')}: {score.toFixed(1)}%
            {stats && ` (${stats.correctPieces}/${stats.totalPieces})`}
          </h2>

          {/* Skipped notice */}
          {isSkipped && <p className="text-center text-muted-foreground text-sm">{t('skipped')}</p>}

          {/* Progress bar */}
          {accuracy && !isSkipped && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('recreationProgress')}
              </p>
              <SegmentedProgressBar
                segments={[
                  {
                    key: 'correct',
                    value: accuracy.correctPieces,
                    color: 'bg-success',
                    label: t('correct'),
                  },
                  {
                    key: 'incorrect',
                    value: accuracy.incorrectPieces,
                    color: 'bg-destructive',
                    label: t('incorrect'),
                  },
                  {
                    key: 'missing',
                    value: accuracy.missingPieces,
                    color: 'bg-muted-foreground/40',
                    label: t('missing'),
                  },
                ]}
                total={accuracy.totalPieces}
              />
              {accuracy.extraPieces > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {t('extra')}: <span className="font-semibold">+{accuracy.extraPieces}</span> (
                  {t('extraDescription')})
                </p>
              )}
            </div>
          )}

          {/* Board comparison */}
          {resultItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
                <BoardFrame>
                  <AnimatedChessBoard
                    initialFen={resultItem.fen}
                    showCoordinates={false}
                    flipped={isBlackToMove}
                    boardTheme={preferences.boardTheme}
                  />
                </BoardFrame>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t('yourRecreation')}
                </p>
                <BoardFrame>
                  <ChessBoardWithOverlay
                    fen={resultItem.recreatedFen || '8/8/8/8/8/8/8/8 w - - 0 1'}
                    flipped={isBlackToMove}
                    squareDifferences={squareDifferences}
                    boardTheme={preferences.boardTheme}
                  />
                </BoardFrame>
              </div>
            </div>
          )}

          {/* EXP gained — placed after the board comparison (all result
              content) and immediately before the action buttons, per user
              preference for the position-memory single-position layout. */}
          {expInfo && <ExpGainDisplay expInfo={expInfo} />}

          {/* Sign-up nudge for anonymous solvers (renders nothing when signed
              in). Sits in the same slot as the EXP card — directly above the
              action buttons — so guests who just finished a community puzzle /
              position see the prompt to create an account before the retry /
              back-to-list buttons can carry them away. (EXP and this banner are
              mutually exclusive: expInfo is null for guests.) */}
          <SignUpBanner locale={locale} />

          {/* Like CTA + Created-by attribution — only for a run backed by a
              saved position (positionId set); the token-based custom-FEN
              result has no position to like or attribute. Same slot/order as
              the puzzle result screen: like nudge directly above the action
              buttons, attribution row right below it. */}
          {positionId &&
            typeof initialLikeCount === 'number' &&
            typeof initialLikedByMe === 'boolean' && (
              <>
                <ResultLikeCta
                  initialLikeCount={initialLikeCount}
                  initialLikedByMe={initialLikedByMe}
                  onToggle={() => toggleLike(positionId, locale)}
                  label={t('likeCta')}
                  likedLabel={t('likedCta')}
                />
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <span>{t('detail.createdBy')}</span>
                  <UserAvatar
                    profileHref={profile?.username ? `/u/${profile.username}` : null}
                    avatarUrl={profile?.avatarUrl}
                    displayName={displayName ?? ''}
                    locale={locale}
                    size="xs"
                    layout="inline"
                  />
                </div>

                {/* Same-author discovery link, right below the attribution —
                    points at this author's position-memory-only list (not
                    the mixed profile view), so solvers who liked this
                    position can find more like it. */}
                {profile?.username && (
                  <div className="text-right text-sm">
                    <Link
                      href={`/${locale}/u/${profile.username}/problems/position-memory`}
                      className={TEXT_LINK_MUTED_CLASSES}
                    >
                      {t('detail.viewOtherPositions')}
                    </Link>
                  </div>
                )}
              </>
            )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href={`/${locale}${sessionPath}?timeLimit=${timeLimit}`} className="block">
              <Button variant="primary" size="lg" fullWidth>
                {t('detail.tryAgain')}
              </Button>
            </Link>
            <Link href={`/${locale}/practice/position-memory`} className="block">
              <Button variant="secondary" size="lg" fullWidth>
                {t('detail.backToList')}
              </Button>
            </Link>
            {resultItem && (
              <Button
                onClick={() => window.open(fenToLichessUrl(resultItem.fen), '_blank')}
                variant="secondary"
                size="lg"
                fullWidth
                icon={<FaExternalLinkAlt className="w-4 h-4" />}
              >
                {t('analyzeOnLichess')}
              </Button>
            )}
          </div>

          {/* Required Knowledge */}
          <div className="mt-8 space-y-4">
            <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CardLink
                href="/learn/memory/position-memory"
                icon="🧠"
                title={t('articles.positionMemory.title')}
                description={t('articles.positionMemory.description')}
                locale={locale}
              />
              <CardLink
                href="/learn/memory/de-groot-experiment"
                icon="🧪"
                title={t('articles.deGrootExperiment.title')}
                description={t('articles.deGrootExperiment.description')}
                locale={locale}
              />
            </div>
          </div>

          {/* `ad-slot-wrapper` so the spacer collapses with the ad for ad-free viewers. */}
          {adBannerStandard && <div className="mt-8 ad-slot-wrapper">{adBannerStandard}</div>}
        </div>

        {breadcrumb && (
          <div className="!mt-4 space-y-4">
            <Divider />
            {breadcrumb}
          </div>
        )}
      </PagePanel>
    </div>
  );
}

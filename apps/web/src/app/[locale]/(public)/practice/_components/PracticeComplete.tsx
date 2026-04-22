'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import { FaRedo } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import type {
  PracticeCompleteLabels,
  ProblemResult,
  ScoreStats,
} from '../_lib/practice-complete-types';
import { ExpGainDisplay } from './ExpGainDisplay';
import { PracticeCompleteSummary } from './PracticeCompleteSummary';
import { ProblemResultList } from './ProblemResultList';
import { RankAchievementModal } from './RankAchievementModal';

type Props = {
  score: number;
  total: number;
  onTryAgain: () => void;
  locale: Locale;
  labels: PracticeCompleteLabels;
  relatedModule?: {
    href: string;
    icon: string;
    title: string;
    description: string;
    sectionTitle?: string;
  };
  averageTimeText?: string;
  scoreStats?: ScoreStats;
  problemResults?: ProblemResult[];
  onExit?: () => void;
  children?: React.ReactNode;
  otherPracticeLink?: {
    href: string;
    label: string;
  };
  afterActions?: React.ReactNode;
  beforeRelatedContent?: React.ReactNode;
  /** EXP gained info for the current result, fetched server-side and passed down. */
  expInfo?: ExpInfo | null;
};

export function PracticeComplete({
  score,
  total,
  onTryAgain,
  locale,
  labels,
  relatedModule,
  averageTimeText,
  scoreStats,
  problemResults,
  onExit,
  children,
  otherPracticeLink,
  afterActions,
  beforeRelatedContent,
  expInfo = null,
}: Props) {
  const router = useRouter();

  return (
    <>
      <PracticeCompleteSummary
        score={score}
        total={total}
        labels={labels}
        averageTimeText={averageTimeText}
        scoreStats={scoreStats}
      />

      <ExpGainDisplay expInfo={expInfo} />

      {problemResults && <ProblemResultList problemResults={problemResults} labels={labels} />}

      {/* Custom children (e.g. Route Planner results) */}
      {children}

      <div className="space-y-4 mt-6">
        <Button
          onClick={onTryAgain}
          variant="primary"
          size="lg"
          fullWidth
          icon={<FaRedo />}
          className="rounded-lg"
        >
          {labels.tryAgain}
        </Button>

        <Button
          onClick={onExit ? onExit : () => router.push(`/${locale}/practice`)}
          variant="secondary"
          size="lg"
          fullWidth
          className="rounded-lg"
        >
          {labels.morePractice}
        </Button>

        {otherPracticeLink && (
          <div className="text-center pt-2">
            <Link
              href={otherPracticeLink.href}
              className={`text-sm font-medium ${TEXT_LINK_CLASSES}`}
            >
              {otherPracticeLink.label}
            </Link>
          </div>
        )}

        {afterActions}
      </div>

      {/* Ad banner before related content */}
      {beforeRelatedContent && <div className="mt-12">{beforeRelatedContent}</div>}

      {/* Related learning module */}
      {relatedModule && (
        <div className="mt-12 space-y-3">
          <SectionTitle>
            {relatedModule.sectionTitle || labels.relatedLearning || 'Related Learning'}
          </SectionTitle>
          <CardLink
            href={relatedModule.href}
            icon={relatedModule.icon}
            title={relatedModule.title}
            description={relatedModule.description}
            locale={locale}
          />
        </div>
      )}

      <RankAchievementModal locale={locale} />
    </>
  );
}

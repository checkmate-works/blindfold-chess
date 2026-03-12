'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaRedo } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeCompleteSummary } from './PracticeCompleteSummary';
import { PracticeLayout } from './PracticeLayout';
import { PracticePanel } from './PracticePanel';
import { ProblemResultList } from './ProblemResultList';
import type { PracticeCompleteLabels, ProblemResult, ScoreStats } from './practice-complete-types';

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
}: Props) {
  const router = useRouter();

  return (
    <PracticeLayout>
      <PracticePanel className="p-8">
        <PracticeCompleteSummary
          score={score}
          total={total}
          labels={labels}
          averageTimeText={averageTimeText}
          scoreStats={scoreStats}
        />

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
                className="text-primary hover:underline text-sm font-medium"
              >
                {otherPracticeLink.label}
              </Link>
            </div>
          )}
        </div>
      </PracticePanel>

      {/* Related learning module */}
      {relatedModule && (
        <PracticePanel className="mt-12 p-6 space-y-3">
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
        </PracticePanel>
      )}
    </PracticeLayout>
  );
}

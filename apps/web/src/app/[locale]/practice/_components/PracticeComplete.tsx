'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaRedo } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeCompleteSummary } from './PracticeCompleteSummary';
import { ProblemResultList } from './ProblemResultList';
import type { PracticeCompleteLabels, ProblemResult } from './practice-complete-types';

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
  detailedStats?: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  };
  problemResults?: ProblemResult[];
  isCustomFen?: boolean;
  onDeleteFen?: (fen: string) => void;
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
  detailedStats,
  problemResults,
  isCustomFen,
  onDeleteFen,
  onExit,
  children,
  otherPracticeLink,
}: Props) {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <PracticeCompleteSummary
          score={score}
          total={total}
          labels={labels}
          averageTimeText={averageTimeText}
          detailedStats={detailedStats}
        />

        {problemResults && (
          <ProblemResultList
            problemResults={problemResults}
            labels={labels}
            isCustomFen={isCustomFen}
            onDeleteFen={onDeleteFen}
          />
        )}

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
      </div>

      {/* Related learning module */}
      {relatedModule && (
        <div className="mt-12">
          <SectionTitle className="text-xl font-semibold mb-4">
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
    </div>
  );
}

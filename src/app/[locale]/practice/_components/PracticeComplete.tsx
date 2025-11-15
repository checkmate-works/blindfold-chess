'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  score: number;
  total: number;
  onTryAgain: () => void;
  locale: Locale;
  labels: {
    practiceComplete: string;
    score: string;
    tryAgain: string;
    morePractice: string;
    recreationProgress?: string;
    correct?: string;
    incorrect?: string;
    missing?: string;
    extra?: string;
    extraDescription?: string;
  };
  relatedModule?: {
    href: string;
    icon: string;
    title: string;
    description: string;
    sectionTitle?: string;
  };
  // Optional detailed breakdown (for position memory practice)
  detailedStats?: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  };
};

export function PracticeComplete({
  score,
  total,
  onTryAgain,
  locale,
  labels,
  relatedModule,
  detailedStats,
}: Props) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <SectionTitle className="text-2xl font-bold text-center mb-6">
          {labels.practiceComplete}
        </SectionTitle>

        {/* Score display - unified with individual problem results */}
        {detailedStats && labels.recreationProgress ? (
          // Position memory: show only accuracy with fraction
          <SectionTitle className="text-2xl font-bold text-center mb-6">
            {labels.score}
          </SectionTitle>
        ) : (
          // Other practices: show traditional score display
          <div className="mb-6 text-center">
            <p className="text-3xl font-bold text-foreground mb-2">
              {score} / {total}
            </p>
            <p className="text-muted-foreground">{labels.score}</p>
          </div>
        )}

        {/* Detailed stats with progress bar (for position memory) */}
        {detailedStats && labels.recreationProgress && (
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
              {labels.recreationProgress}
            </p>
            <div className="w-full h-8 bg-muted rounded-lg overflow-hidden flex">
              <div
                className="bg-green-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.correctPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.correctPieces > 0 && detailedStats.correctPieces}
              </div>
              <div
                className="bg-red-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.incorrectPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.incorrectPieces > 0 && detailedStats.incorrectPieces}
              </div>
              <div
                className="bg-muted-foreground/40 flex items-center justify-center text-white text-sm font-semibold"
                style={{
                  width: `${(detailedStats.missingPieces / detailedStats.totalPieces) * 100}%`,
                }}
              >
                {detailedStats.missingPieces > 0 && detailedStats.missingPieces}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>
                  {labels.correct}: {detailedStats.correctPieces}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>
                  {labels.incorrect}: {detailedStats.incorrectPieces}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-muted-foreground/40 rounded"></div>
                <span>
                  {labels.missing}: {detailedStats.missingPieces}
                </span>
              </div>
            </div>

            {/* Extra pieces section - 控えめに */}
            {detailedStats.extraPieces > 0 && labels.extra && labels.extraDescription && (
              <p className="text-xs text-muted-foreground mt-3">
                {labels.extra}: <span className="font-semibold">+{detailedStats.extraPieces}</span>{' '}
                ({labels.extraDescription})
              </p>
            )}
          </div>
        )}

        <div className="space-y-4 mt-6">
          <Button onClick={onTryAgain} variant="primary" size="lg" fullWidth className="rounded-lg">
            {labels.tryAgain}
          </Button>

          <Button
            onClick={() => router.push(`/${locale}/practice`)}
            variant="secondary"
            size="lg"
            fullWidth
            className="rounded-lg"
          >
            {labels.morePractice}
          </Button>
        </div>
      </div>

      {/* Related learning module */}
      {relatedModule && (
        <div className="mt-12 p-6 bg-secondary/30 rounded-lg border border-border">
          <SectionTitle className="text-xl font-semibold mb-4">
            {relatedModule.sectionTitle || 'Related Learning'}
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

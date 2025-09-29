'use client';

import { useRouter } from 'next/navigation';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '../../_lib/types';

interface PracticeCompleteProps {
  score: number;
  total: number;
  onTryAgain: () => void;
  locale: Locale;
  labels: {
    practiceComplete: string;
    score: string;
    tryAgain: string;
    morePractice: string;
  };
  relatedModule?: {
    href: string;
    icon: string;
    title: string;
    description: string;
    sectionTitle?: string;
  };
}

export function PracticeComplete({
  score,
  total,
  onTryAgain,
  locale,
  labels,
  relatedModule,
}: PracticeCompleteProps) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
        <SectionTitle className="text-2xl font-bold mb-6">{labels.practiceComplete}</SectionTitle>

        <div className="mb-8">
          <p className="text-3xl font-bold text-foreground mb-2">
            {score} / {total}
          </p>
          <p className="text-muted-foreground">{labels.score}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onTryAgain}
            className="w-full py-3 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {labels.tryAgain}
          </button>

          <button
            onClick={() => router.push(`/${locale}/practice`)}
            className="w-full py-3 px-6 bg-secondary text-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {labels.morePractice}
          </button>
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

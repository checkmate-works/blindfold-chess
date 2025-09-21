'use client';

import { useRouter } from 'next/navigation';
import { CardLink } from '@/app/[locale]/_components';

interface PracticeCompleteProps {
  score: number;
  total: number;
  onTryAgain: () => void;
  locale: 'en' | 'ja';
  translations: {
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
  translations,
  relatedModule,
}: PracticeCompleteProps) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
        <h2 className="text-2xl font-bold mb-6 text-foreground">{translations.practiceComplete}</h2>

        <div className="mb-8">
          <p className="text-3xl font-bold text-foreground mb-2">
            {score} / {total}
          </p>
          <p className="text-muted-foreground">{translations.score}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onTryAgain}
            className="w-full py-3 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {translations.tryAgain}
          </button>

          <button
            onClick={() => router.push(`/${locale}/practice`)}
            className="w-full py-3 px-6 bg-secondary text-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {translations.morePractice}
          </button>
        </div>
      </div>

      {/* Related learning module */}
      {relatedModule && (
        <div className="mt-12 p-6 bg-secondary/30 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            {relatedModule.sectionTitle || 'Related Learning'}
          </h2>
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

'use client';

import { Link } from '@/i18n/routing';

interface PracticeResultProps {
  score: {
    correct: number;
    total: number;
    accuracy: number;
    timeElapsed: number; // in seconds
    averageTime: number; // in seconds
  };
  onTryAgain: () => void;
  locale: 'en' | 'ja';
  translations: {
    correctAnswers: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
    tryAgain: string;
    morePractice: string;
  };
}

export function PracticeResult({ score, onTryAgain, locale, translations }: PracticeResultProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAverageTime = (seconds: number) => {
    const formatted = seconds.toFixed(1);
    return locale === 'ja' ? `${formatted}秒` : `${formatted}s`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
          {locale === 'ja' ? '結果' : 'Result'}
        </h2>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {score.correct}/{score.total}
            </div>
            <div className="text-sm text-muted-foreground">{translations.correctAnswers}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {score.accuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">{translations.accuracy}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {formatTime(score.timeElapsed)}
            </div>
            <div className="text-sm text-muted-foreground">{translations.timeTaken}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {formatAverageTime(score.averageTime)}
            </div>
            <div className="text-sm text-muted-foreground">{translations.averageTime}</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={onTryAgain}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {translations.tryAgain}
          </button>
          <Link
            href="/practice"
            locale={locale}
            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 px-6 rounded-xl transition-colors text-center"
          >
            {translations.morePractice}
          </Link>
        </div>
      </div>
    </div>
  );
}

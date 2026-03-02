'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { PracticeMode } from '@blindfold-chess/features/common';
import { FaPlay } from 'react-icons/fa';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/_components/BoardOrientationSelector';
import { ProblemCountSlider } from '@/app/[locale]/(public)/practice/_components/ProblemCountSlider';
import { SegmentedControl } from '@/app/[locale]/(public)/practice/_components/SegmentedControl';
import { BetaNotice, CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type BoardOrientation = 'white' | 'black' | 'random';

type Props = {
  locale: Locale;
  problemCount: number;
  orientation: BoardOrientation;
  mode: PracticeMode;
  onProblemCountChange: (count: number) => void;
  onOrientationChange: (orientation: BoardOrientation) => void;
  onModeChange: (mode: PracticeMode) => void;
};

export default function QuadrantQuizSetup({
  locale,
  problemCount,
  orientation,
  mode,
  onProblemCountChange,
  onOrientationChange,
  onModeChange,
}: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tSettings = useTranslations('practice.settings');
  const tQuiz = useTranslations('practice.coordinateQuiz');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    if (mode === 'training') {
      router.push(`/${locale}/practice/quadrants/training?orientation=${orientation}`);
    } else {
      router.push(
        `/${locale}/practice/quadrants/challenge?count=${problemCount}&orientation=${orientation}`
      );
    }
  };

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'timed', label: tp('modeTimed') },
    { value: 'training', label: tp('modeTraining') },
  ];

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8">
        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <div className="mb-6 text-muted-foreground">
          <p>{t('description')}</p>
        </div>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        {mode === 'timed' && (
          <div className="mb-6">
            <ProblemCountSlider
              count={problemCount}
              onCountChange={onProblemCountChange}
              labels={{
                count: tSettings('problemCount'),
                unit: tSettings('problems'),
              }}
            />
          </div>
        )}

        {mode === 'training' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        <div className="mb-6">
          <BoardOrientationSelector
            value={orientation}
            onChange={onOrientationChange}
            labels={{
              title: tQuiz('boardOrientation'),
              white: tQuiz('white'),
              black: tQuiz('black'),
              random: tQuiz('random'),
            }}
          />
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full mt-8"
          icon={<FaPlay />}
        >
          {mode === 'training' ? tp('startTraining') : tSettings('start')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/coordinates/anchor-squares"
            icon="⚓"
            title={t('articles.anchorSquares.title')}
            description={t('articles.anchorSquares.description')}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';

import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

import type { BoardOrientation } from '../_lib/types';
import { formatTime } from '../_lib/utils';

type Props = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  onTimeLimitChange: (time: number) => void;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
};

export function CoordinateQuizSettings({
  timeLimit,
  boardOrientation,
  onTimeLimitChange,
  onBoardOrientationChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <TimeSlider
        timeLimit={timeLimit}
        onTimeLimitChange={onTimeLimitChange}
        labels={{
          timeLimit: t('timeLimit'),
        }}
        showSeconds={false}
        formatTime={formatTime}
      />

      {/* Board Orientation */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('boardOrientation')}
        </label>
        <div className="flex gap-2">
          {/* White */}
          <button
            onClick={() => onBoardOrientationChange('white')}
            className={`flex items-center justify-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
              boardOrientation === 'white'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
            title={t('white')}
          >
            <span className="w-5 h-5 rounded-full bg-white border-2 border-gray-400" />
            <span className="hidden sm:inline">{t('white')}</span>
          </button>

          {/* Black */}
          <button
            onClick={() => onBoardOrientationChange('black')}
            className={`flex items-center justify-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
              boardOrientation === 'black'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
            title={t('black')}
          >
            <span className="w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-600" />
            <span className="hidden sm:inline">{t('black')}</span>
          </button>

          {/* Random */}
          <button
            onClick={() => onBoardOrientationChange('random')}
            className={`flex items-center justify-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
              boardOrientation === 'random'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
            title={t('random')}
          >
            <span className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-white border-2 border-gray-400" />
              <span className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-600" />
            </span>
            <span className="hidden sm:inline">{t('random')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

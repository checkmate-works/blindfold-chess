'use client';

import { useTranslations } from 'next-intl';
import type { BoardOrientation } from '../_lib/types';
import { formatTime } from '../_lib/utils';
import { TimeSlider } from '../../_components/TimeSlider';

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
          {(['white', 'black', 'random'] as const).map((orientation) => (
            <button
              key={orientation}
              onClick={() => onBoardOrientationChange(orientation)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                boardOrientation === orientation
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {t(orientation)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

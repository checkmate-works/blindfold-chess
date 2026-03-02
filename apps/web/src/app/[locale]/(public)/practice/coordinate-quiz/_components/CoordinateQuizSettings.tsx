'use client';

import { useTranslations } from 'next-intl';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/_components/BoardOrientationSelector';
import { TimeSlider } from '@/app/[locale]/(public)/practice/_components/TimeSlider';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { FEEDBACK_SPEEDS } from '../_lib/types';
import { formatTime } from '../_lib/utils';

type Props = {
  timeLimit: number;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  onTimeLimitChange: (time: number) => void;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
  onFeedbackSpeedChange: (speed: FeedbackSpeed) => void;
  showTimeSlider?: boolean;
};

export function CoordinateQuizSettings({
  timeLimit,
  boardOrientation,
  feedbackSpeed,
  onTimeLimitChange,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
  showTimeSlider = true,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');

  return (
    <div className="flex flex-col gap-8">
      {/* Time Limit */}
      {showTimeSlider && (
        <TimeSlider
          timeLimit={timeLimit}
          onTimeLimitChange={onTimeLimitChange}
          labels={{
            timeLimit: t('timeLimit'),
          }}
          showSeconds={false}
          formatTime={formatTime}
        />
      )}

      {/* Board Orientation */}
      <BoardOrientationSelector
        value={boardOrientation}
        onChange={onBoardOrientationChange}
        labels={{
          title: t('boardOrientation'),
          white: t('white'),
          black: t('black'),
          random: t('random'),
        }}
      />

      {/* Feedback Speed */}
      <div className="flex flex-col gap-2">
        <label className="block text-sm font-medium text-foreground">{t('feedbackSpeed')}</label>
        <div className="flex justify-center gap-4">
          {FEEDBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => onFeedbackSpeedChange(speed)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                feedbackSpeed === speed
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {t(`feedbackSpeeds.${speed}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

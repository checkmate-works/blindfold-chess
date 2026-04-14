'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BoardOrientationSelector } from '@/app/[locale]/(public)/practice/(challenge)/_components/BoardOrientationSelector';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { FEEDBACK_SPEEDS } from '../_lib/types';

type Props = {
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  onBoardOrientationChange: (orientation: BoardOrientation) => void;
  onFeedbackSpeedChange: (speed: FeedbackSpeed) => void;
};

export function CoordinateQuizSettings({
  boardOrientation,
  feedbackSpeed,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');

  return (
    <div className="flex flex-col gap-8">
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

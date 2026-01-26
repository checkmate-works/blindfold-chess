'use client';

import { useTranslations } from 'next-intl';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

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
};

export function CoordinateQuizSettings({
  timeLimit,
  boardOrientation,
  feedbackSpeed,
  onTimeLimitChange,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const { preferences } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  return (
    <div className="flex flex-col gap-8">
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
      <div className="flex flex-col gap-2">
        <label className="block text-sm font-medium text-foreground">{t('boardOrientation')}</label>
        <div className="flex justify-center gap-6">
          {/* White */}
          <button
            onClick={() => onBoardOrientationChange('white')}
            className={`flex flex-col items-center gap-2 transition-all ${
              boardOrientation === 'white' ? 'scale-105' : 'opacity-60 hover:opacity-80'
            }`}
            title={t('white')}
          >
            <span
              className={`w-16 h-16 rounded-md border-2 ${themeColors.light} ${
                boardOrientation === 'white' ? 'border-primary' : 'border-border'
              } shadow-sm`}
            />
            <span className="text-sm font-medium">{t('white')}</span>
          </button>

          {/* Black */}
          <button
            onClick={() => onBoardOrientationChange('black')}
            className={`flex flex-col items-center gap-2 transition-all ${
              boardOrientation === 'black' ? 'scale-105' : 'opacity-60 hover:opacity-80'
            }`}
            title={t('black')}
          >
            <span
              className={`w-16 h-16 rounded-md border-2 ${themeColors.dark} ${
                boardOrientation === 'black' ? 'border-primary' : 'border-border'
              } shadow-sm`}
            />
            <span className="text-sm font-medium">{t('black')}</span>
          </button>

          {/* Random */}
          <button
            onClick={() => onBoardOrientationChange('random')}
            className={`flex flex-col items-center gap-2 transition-all ${
              boardOrientation === 'random' ? 'scale-105' : 'opacity-60 hover:opacity-80'
            }`}
            title={t('random')}
          >
            <span
              className={`w-16 h-16 rounded-md border-2 overflow-hidden ${
                boardOrientation === 'random' ? 'border-primary' : 'border-border'
              } shadow-sm flex`}
            >
              <span className={`w-1/2 h-full ${themeColors.light}`} />
              <span className={`w-1/2 h-full ${themeColors.dark}`} />
            </span>
            <span className="text-sm font-medium">{t('random')}</span>
          </button>
        </div>
      </div>

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

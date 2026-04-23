'use client';

import type { BoardOrientation } from '@blindfold-chess/types';

import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  value: BoardOrientation;
  onChange: (orientation: BoardOrientation) => void;
  labels: {
    title: string;
    white: string;
    black: string;
    random: string;
  };
  size?: 'default' | 'compact';
  hideLabel?: boolean;
  hideOptionLabels?: boolean;
};

export function BoardOrientationSelector({
  value,
  onChange,
  labels,
  size = 'default',
  hideLabel = false,
  hideOptionLabels = false,
}: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

  const sizeConfig =
    size === 'compact'
      ? { box: 'w-10 h-10 sm:w-12 sm:h-12', gap: 'gap-2 sm:gap-3', text: 'text-xs sm:text-sm' }
      : { box: 'w-16 h-16', gap: 'gap-6', text: 'text-sm' };

  const options: { key: BoardOrientation; label: string }[] = [
    { key: 'white', label: labels.white },
    { key: 'black', label: labels.black },
    { key: 'random', label: labels.random },
  ];

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {!hideLabel && (
        <label className="block text-sm font-medium text-foreground">{labels.title}</label>
      )}
      <div className={`flex justify-center ${sizeConfig.gap}`}>
        {options.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-2 transition-all ${
              value === key ? 'scale-105' : 'opacity-60 hover:opacity-80'
            }`}
            title={label}
          >
            <span
              className={`${sizeConfig.box} rounded-md border-2 ${
                key === 'random'
                  ? `overflow-hidden ${value === key ? 'border-primary' : 'border-border'} flex`
                  : `${key === 'white' ? themeColors.light : themeColors.dark} ${value === key ? 'border-primary' : 'border-border'}`
              }`}
            >
              {key === 'random' && (
                <>
                  <span className={`w-1/2 h-full ${themeColors.light}`} />
                  <span className={`w-1/2 h-full ${themeColors.dark}`} />
                </>
              )}
            </span>
            {!hideOptionLabels && <span className={`${sizeConfig.text} font-medium`}>{label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

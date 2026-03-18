'use client';

import { getBoardThemeColors } from '@/lib/boardThemes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type BoardOrientation = 'white' | 'black' | 'random';

type Props = {
  value: BoardOrientation;
  onChange: (orientation: BoardOrientation) => void;
  labels: {
    title: string;
    white: string;
    black: string;
    random: string;
  };
};

export function BoardOrientationSelector({ value, onChange, labels }: Props) {
  const { preferences, isLoaded } = useGamePreferences();
  const themeColors = getBoardThemeColors(preferences.boardTheme);

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
      <label className="block text-sm font-medium text-foreground">{labels.title}</label>
      <div className="flex justify-center gap-6">
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
              className={`w-16 h-16 rounded-md border-2 ${
                key === 'random'
                  ? `overflow-hidden ${value === key ? 'border-primary' : 'border-border'} shadow-sm flex`
                  : `${key === 'white' ? themeColors.light : themeColors.dark} ${value === key ? 'border-primary' : 'border-border'} shadow-sm`
              }`}
            >
              {key === 'random' && (
                <>
                  <span className={`w-1/2 h-full ${themeColors.light}`} />
                  <span className={`w-1/2 h-full ${themeColors.dark}`} />
                </>
              )}
            </span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

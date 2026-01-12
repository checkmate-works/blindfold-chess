'use client';

import { useTranslations } from 'next-intl';

type Props = {
  value: 'new' | 'pgn';
  onChange: (value: 'new' | 'pgn') => void;
};

export function StartMethodSelector({ value, onChange }: Props) {
  const t = useTranslations('newGame');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        onClick={() => onChange('new')}
        className={`relative p-4 rounded-md border-2 text-left transition-all ${
          value === 'new'
            ? 'border-foreground bg-foreground/10'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        {value === 'new' && (
          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-background"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
        <div className="pr-8">
          <h3 className="font-medium mb-1">{t('newGame')}</h3>
          <p className="text-sm text-muted-foreground">{t('newGameDescription')}</p>
        </div>
      </button>

      <button
        onClick={() => onChange('pgn')}
        className={`relative p-4 rounded-md border-2 text-left transition-all ${
          value === 'pgn'
            ? 'border-foreground bg-foreground/10'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        {value === 'pgn' && (
          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-background"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
        <div className="pr-8">
          <h3 className="font-medium mb-1">{t('fromPgn')}</h3>
          <p className="text-sm text-muted-foreground">{t('fromPgnDescription')}</p>
        </div>
      </button>
    </div>
  );
}

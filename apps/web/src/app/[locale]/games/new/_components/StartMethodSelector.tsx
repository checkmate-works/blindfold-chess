'use client';

import { useTranslations } from 'next-intl';

export type StartMethod = 'new' | 'pgn' | 'position';

type Props = {
  value: StartMethod;
  onChange: (value: StartMethod) => void;
};

const CheckIcon = () => (
  <div className="absolute top-3 right-3">
    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
);

export function StartMethodSelector({ value, onChange }: Props) {
  const t = useTranslations('newGame');

  const options: { key: StartMethod; label: string; description: string }[] = [
    { key: 'new', label: t('newGame'), description: t('newGameDescription') },
    { key: 'pgn', label: t('fromPgn'), description: t('fromPgnDescription') },
    { key: 'position', label: t('customPosition'), description: t('customPositionDescription') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`relative p-4 rounded-md border text-left transition-all ${
            value === option.key
              ? 'border-foreground bg-foreground/10'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          {value === option.key && <CheckIcon />}
          <div className="pr-8">
            <h3 className="font-medium mb-1">{option.label}</h3>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

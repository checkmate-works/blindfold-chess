'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { type EngineKind, isEngineKind } from '@/lib/engines';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type Props = {
  value: EngineKind;
  onChange: (value: EngineKind) => void;
};

/**
 * Lets the user pick which AI engine they'll play against. Stockfish is
 * the strong-and-tunable default; Maia trades raw strength for human-
 * style move selection (Maia 3 trained on millions of online human
 * games, conditioned on player Elo).
 */
export function EngineSelector({ value, onChange }: Props) {
  const t = useTranslations('newGame');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isEngineKind(event.target.value)) {
      onChange(event.target.value);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle>{t('selectEngine')}</SectionTitle>
      <select
        value={value}
        onChange={handleChange}
        className="w-full p-3 rounded-md border border-border bg-background text-foreground hover:border-muted-foreground focus:border-foreground focus:outline-none transition-all"
        aria-label={t('selectEngine')}
      >
        <option value="stockfish">{t('engineStockfishLabel')}</option>
        <option value="maia">{t('engineMaiaLabel')}</option>
      </select>
      <p className="text-sm text-muted-foreground">
        {value === 'maia' ? t('engineMaiaDescription') : t('engineStockfishDescription')}
      </p>
    </div>
  );
}

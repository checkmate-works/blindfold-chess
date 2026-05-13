'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type Props = {
  value: Side;
  onChange: (value: Side) => void;
  disabled?: boolean;
};

/**
 * Compact two-way segmented control for picking the player's colour.
 *
 * Visual style matches the Board/FEN tab switcher on
 * `/practice/puzzle/new` — `flex` + `rounded-lg bg-secondary p-1` shell
 * with `bg-card text-foreground` on the active half.
 *
 * Why segmented control vs. the old big-card layout: most users pick a
 * colour in one click and never revisit it. The card layout occupied
 * the most prominent slot on the form for what is functionally a
 * two-way switch, crowding out the now-more-important Engine Selector.
 */
export function ColorSelector({ value, onChange, disabled = false }: Props) {
  const t = useTranslations('newGame');

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <SectionTitle>{t('selectColor')}</SectionTitle>
      <nav
        className="flex rounded-lg bg-secondary p-1"
        role="tablist"
        aria-label={t('selectColor')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={value === 'white'}
          onClick={() => onChange('white')}
          disabled={disabled}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            value === 'white'
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true">○</span>
            {t('playAsWhite')}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value === 'black'}
          onClick={() => onChange('black')}
          disabled={disabled}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            value === 'black'
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true">●</span>
            {t('playAsBlack')}
          </span>
        </button>
      </nav>
    </div>
  );
}

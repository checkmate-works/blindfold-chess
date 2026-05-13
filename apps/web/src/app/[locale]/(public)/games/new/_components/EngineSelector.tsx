'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLock } from 'react-icons/fa';

import { type EngineKind } from '@/lib/engines';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type Props = {
  value: EngineKind;
  onChange: (value: EngineKind) => void;
  /**
   * Whether the current viewer is allowed to pick Maia. When false, the
   * Maia card is rendered with a lock affordance and a click does not
   * change `value` — it still highlights briefly for affordance but the
   * caller's `onChange` is never invoked for `'maia'`.
   */
  maiaUnlocked: boolean;
  disabled?: boolean;
};

type EngineOption = {
  kind: EngineKind;
  logoSrc: string;
  labelKey: 'engineStockfishLabel' | 'engineMaiaLabel';
  descriptionKey: 'engineStockfishDescription' | 'engineMaiaDescription';
};

/**
 * Visual order is intentional: Stockfish first (free, default), Maia
 * second (paid / granted). New engines append to this list.
 */
const ENGINE_OPTIONS: ReadonlyArray<EngineOption> = [
  {
    kind: 'stockfish',
    logoSrc: '/images/engines/stockfish.png',
    labelKey: 'engineStockfishLabel',
    descriptionKey: 'engineStockfishDescription',
  },
  {
    kind: 'maia',
    logoSrc: '/images/engines/maia.png',
    labelKey: 'engineMaiaLabel',
    descriptionKey: 'engineMaiaDescription',
  },
];

/**
 * Card-style two-up engine picker — visually the most prominent control
 * on the new-game form. Each card shows the engine's official logo and a
 * short blurb; selecting one highlights its border the same way the old
 * Play-as-White / Play-as-Black card layout did.
 *
 * When `maiaUnlocked === false`, the Maia card is rendered as a locked
 * affordance (greyed out, padlock badge, "Subscribers only" hint) and
 * clicking it is a no-op. Eligibility is determined server-side via
 * `canUseMaia()` and passed in as a prop — this component is purely
 * presentational.
 */
export function EngineSelector({ value, onChange, maiaUnlocked, disabled = false }: Props) {
  const t = useTranslations('newGame');

  const handleClick = (kind: EngineKind) => {
    if (disabled) return;
    if (kind === 'maia' && !maiaUnlocked) return;
    onChange(kind);
  };

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <SectionTitle>{t('selectEngine')}</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        {ENGINE_OPTIONS.map((opt) => {
          const isLocked = opt.kind === 'maia' && !maiaUnlocked;
          const isSelected = value === opt.kind;
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => handleClick(opt.kind)}
              disabled={disabled || isLocked}
              aria-pressed={isSelected}
              aria-label={isLocked ? `${t(opt.labelKey)} — ${t('engineLocked')}` : t(opt.labelKey)}
              className={`relative p-6 rounded-md border transition-all text-left ${
                isSelected && !isLocked
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              } ${isLocked ? 'cursor-not-allowed opacity-60' : ''} ${
                disabled ? 'cursor-not-allowed' : ''
              }`}
            >
              {isLocked && (
                <span
                  className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  <FaLock className="h-3 w-3" />
                  {t('engineLockedBadge')}
                </span>
              )}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  <Image
                    src={opt.logoSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="object-contain"
                    // The engine logo is purely decorative — the visible
                    // label below provides the accessible name. Empty
                    // alt + `aria-hidden` would be ideal but Next/Image
                    // requires `alt`; the empty string is the spec-OK
                    // way to signal "decorative".
                  />
                </div>
                <h3 className="font-medium text-lg mb-2">{t(opt.labelKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(opt.descriptionKey)}</p>
                {isLocked && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    {t('engineLockedHint')}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLock } from 'react-icons/fa';

import { type EngineKind } from '@/lib/engines';

import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type Props = {
  value: EngineKind;
  onChange: (value: EngineKind) => void;
  /**
   * Whether the current viewer is allowed to pick Maia. When false, the
   * Maia card is rendered with a lock affordance and a click does not
   * change `value`. Eligibility is computed server-side via `canUseMaia()`
   * and passed in here — this component is purely presentational.
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
 * Card-style two-up engine picker. Each card shows just the engine's
 * official logo and label — the longer "what is this engine?" copy
 * lives behind a `?` help tour (driver.js) anchored to the section
 * title, so the cards stay compact on narrow viewports.
 *
 * When `maiaUnlocked === false`, the Maia card is greyed out and shows
 * a "Subscribers only" lock badge; clicking it is a no-op.
 */
export function EngineSelector({ value, onChange, maiaUnlocked, disabled = false }: Props) {
  const t = useTranslations('newGame');

  const handleClick = (kind: EngineKind) => {
    if (disabled) return;
    if (kind === 'maia' && !maiaUnlocked) return;
    onChange(kind);
  };

  const helpSteps: HelpStep[] = ENGINE_OPTIONS.map((opt) => ({
    targetId: `engine-card-${opt.kind}`,
    title: t(opt.labelKey),
    description: t(opt.descriptionKey),
    side: 'bottom',
    align: 'center',
  }));

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2">
        <SectionTitle>{t('selectEngine')}</SectionTitle>
        <HelpTourButton steps={helpSteps} label={t('engineHelpLabel')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ENGINE_OPTIONS.map((opt) => {
          const isLocked = opt.kind === 'maia' && !maiaUnlocked;
          const isSelected = value === opt.kind;
          return (
            <button
              key={opt.kind}
              type="button"
              data-tour-id={`engine-card-${opt.kind}`}
              onClick={() => handleClick(opt.kind)}
              disabled={disabled || isLocked}
              aria-pressed={isSelected}
              aria-label={
                isLocked ? `${t(opt.labelKey)} — ${t('engineLockedHint')}` : t(opt.labelKey)
              }
              className={`relative p-4 rounded-md border transition-all ${
                isSelected && !isLocked
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              } ${isLocked ? 'cursor-not-allowed opacity-60' : ''} ${
                disabled ? 'cursor-not-allowed' : ''
              }`}
            >
              {isLocked && (
                <span
                  className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  <FaLock className="h-3 w-3" />
                  {t('engineLockedHint')}
                </span>
              )}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                  <Image
                    src={opt.logoSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <h3 className="font-medium text-sm sm:text-base">{t(opt.labelKey)}</h3>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

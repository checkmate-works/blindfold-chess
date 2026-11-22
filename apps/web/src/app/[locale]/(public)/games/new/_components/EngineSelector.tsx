'use client';

import Image from 'next/image';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLock } from 'react-icons/fa';

import { ENGINE_LOGO_SRC, type EngineKind } from '@/lib/engines';
import { MAIA_UNLOCK_LEVEL } from '@/lib/users/maia-unlock-level';

import type { MaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type Props = {
  value: EngineKind;
  onChange: (value: EngineKind) => void;
  /**
   * How the Maia card renders: `unlocked` when the viewer's level allows
   * Maia, `locked` when it does not. Computed server-side via
   * `getMaiaEngineAccess()` + `deriveMaiaCardMode()` and passed in — this
   * component is presentational.
   */
  maiaCardMode: MaiaCardMode;
  /**
   * Invoked when a `locked` Maia card is tapped. The parent opens the
   * modal naming the level that unlocks Maia.
   */
  onMaiaLockedClick: () => void;
  disabled?: boolean;
};

type EngineOption = {
  kind: EngineKind;
  logoSrc: string;
  labelKey: 'engineStockfishLabel' | 'engineMaiaLabel';
};

/**
 * Visual order is intentional: Stockfish first (the default), Maia
 * second (unlocked by level). New engines append to this list. Logos come
 * from the shared `ENGINE_LOGO_SRC` map so this picker and the game-list
 * `EngineConfigBadge` never drift apart.
 */
const ENGINE_OPTIONS: ReadonlyArray<EngineOption> = [
  {
    kind: 'stockfish',
    logoSrc: ENGINE_LOGO_SRC.stockfish,
    labelKey: 'engineStockfishLabel',
  },
  {
    kind: 'maia',
    logoSrc: ENGINE_LOGO_SRC.maia,
    labelKey: 'engineMaiaLabel',
  },
];

/**
 * Card-style two-up engine picker. Each card shows the engine's official
 * logo and label — the longer "what is this engine?" copy lives behind the
 * page-level `?` help tour, so the cards stay compact on narrow viewports.
 *
 * The Maia card adapts to `maiaCardMode`:
 *   - `unlocked` — selectable, and a note under the cards says what earned
 *                  it ("unlocked at Lv5"). The note depends only on the
 *                  server-resolved mode, never on which card is selected,
 *                  so it is present from the first paint and toggling the
 *                  selection never shifts the controls below it. It uses
 *                  the soft success foreground (dark green) rather than
 *                  solid `bg-success`: white on that green is about 3.3:1
 *                  in light mode and 2.3:1 in dark, below the 4.5:1 small
 *                  text needs. The note is right-aligned to sit under the
 *                  Maia card.
 *   - `locked`   — greyed out with a lock badge naming the unlock level;
 *                  tapping it is not a no-op, it calls `onMaiaLockedClick`
 *                  so the parent can explain.
 */
export function EngineSelector({
  value,
  onChange,
  maiaCardMode,
  onMaiaLockedClick,
  disabled = false,
}: Props) {
  const t = useTranslations('newGame');

  const handleClick = (kind: EngineKind) => {
    if (disabled) return;
    if (kind === 'maia' && maiaCardMode === 'locked') {
      onMaiaLockedClick();
      return;
    }
    onChange(kind);
  };

  return (
    <div
      data-tour-id="engine-selector"
      className={`space-y-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <SectionTitle>{t('selectEngine')}</SectionTitle>

      <div className="grid grid-cols-2 gap-4">
        {ENGINE_OPTIONS.map((opt) => {
          const isMaia = opt.kind === 'maia';
          const isLocked = isMaia && maiaCardMode === 'locked';
          const isSelected = value === opt.kind;
          const lockedLabel = t('engineLockedHint', { level: MAIA_UNLOCK_LEVEL });
          const ariaLabel = isLocked ? `${t(opt.labelKey)} — ${lockedLabel}` : t(opt.labelKey);
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => handleClick(opt.kind)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={ariaLabel}
              className={`relative p-4 rounded-md border transition-all ${
                isSelected && !isLocked
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:border-muted-foreground'
              } ${isLocked ? 'cursor-pointer opacity-60' : ''} ${
                disabled ? 'cursor-not-allowed' : ''
              }`}
            >
              {isLocked && (
                <span
                  className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  <FaLock className="h-3 w-3" />
                  {lockedLabel}
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

      {maiaCardMode === 'unlocked' && (
        <p className="text-right text-sm font-medium text-success-soft-foreground">
          {t('engineMaiaUnlockedNote', { level: MAIA_UNLOCK_LEVEL })}
        </p>
      )}
    </div>
  );
}

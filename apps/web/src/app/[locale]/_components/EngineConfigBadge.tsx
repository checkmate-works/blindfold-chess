import Image from 'next/image';

import { ENGINE_LOGO_SRC } from '@/lib/engines';
import type { EngineConfig } from '@/lib/engines';

type Props = {
  config: EngineConfig;
  /** Localised "Lv" prefix shown before a Stockfish skill level. */
  levelLabel: string;
};

/**
 * Engine + difficulty as a compact icon-and-number badge for dense
 * game-list rows. The engine's official logo (the same asset used by the
 * `games/new` picker) carries the identity, so the text is just the
 * difficulty knob — a Stockfish skill level ("Lv 5") or a Maia Elo
 * ("1600").
 *
 * This replaces the text-only `formatEngineConfigLabel` output, which
 * read inconsistently in lists ("Maia 1600" vs "Lv 5") because only the
 * Maia form spelled out the engine name. With the logo present, both
 * forms can drop the name and stay symmetric. The full "Maia 1600" /
 * "Stockfish Lv 5" string is preserved as the `title` for hover/tooltip.
 */
export function EngineConfigBadge({ config, levelLabel }: Props) {
  const isMaia = config.kind === 'maia';
  const text = isMaia ? String(config.rating) : `${levelLabel} ${config.skillLevel}`;
  const title = isMaia ? `Maia ${config.rating}` : `Stockfish ${text}`;

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <Image
        src={ENGINE_LOGO_SRC[config.kind]}
        alt=""
        width={18}
        height={18}
        className="object-contain"
      />
      <span className="font-medium">{text}</span>
    </span>
  );
}

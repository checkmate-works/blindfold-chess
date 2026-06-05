'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { AiReplyDuration } from '@/lib/games/ai-reply-duration';
import {
  AI_REPLY_DURATION_KEEP,
  AI_REPLY_DURATION_SLIDER_ORDER,
  aiReplyDurationLabel,
} from '@/lib/games/ai-reply-duration';

type Props = {
  value: AiReplyDuration;
  onChange: (value: AiReplyDuration) => void;
};

/**
 * Row-styled control (matching the Piece Visibility / Piece Color rows) for how
 * long the on-board AI-reply chip keeps the opponent's move visible. A stepped
 * slider whose stops run shortest → longest, with the final stop being "keep
 * visible" (rendered as ∞). Dragging right always means "stays longer", so the
 * no-auto-dismiss option reads naturally as the far end rather than an odd
 * off-continuum choice.
 */
export function AiReplyDurationPicker({ value, onChange }: Props) {
  const t = useTranslations('Preferences');

  // Defensive max(0, …): an out-of-set value (legacy / corrupt) falls back to
  // the first slider stop rather than a -1 index.
  const index = Math.max(0, AI_REPLY_DURATION_SLIDER_ORDER.indexOf(value));
  const { key, params } = aiReplyDurationLabel(value);
  // Full localized label for assistive tech (e.g. "Keep visible" / "4s"); the
  // visible readout stays compact (∞ / "4s") so it never crowds the slider.
  const fullLabel = t(`game.${key}`, params);
  const readout =
    value === AI_REPLY_DURATION_KEEP
      ? '∞'
      : t('game.aiReplyDurationModes.seconds', { seconds: value / 1000 });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-sm text-foreground">{t('game.aiReplyDuration')}</span>
      <div className="flex items-center gap-3 sm:w-44">
        <input
          type="range"
          min={0}
          max={AI_REPLY_DURATION_SLIDER_ORDER.length - 1}
          step={1}
          value={index}
          onChange={(e) => onChange(AI_REPLY_DURATION_SLIDER_ORDER[Number(e.target.value)])}
          aria-label={t('game.aiReplyDuration')}
          aria-valuetext={fullLabel}
          className="h-2 w-full cursor-pointer appearance-none rounded-md bg-secondary accent-foreground"
        />
        <span
          className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground"
          title={fullLabel}
        >
          {readout}
        </span>
      </div>
    </div>
  );
}

'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaClock } from 'react-icons/fa';

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
 * How long the on-board AI-reply chip keeps the opponent's move visible.
 * Rendered as a single row matching the "Allow peeking" toggle (muted,
 * icon-led label on the left; control on the right) since it sits right beside
 * it as a sub-setting of "Hide the board". The control is a stepped slider
 * whose stops run shortest → longest, with "keep visible" as the final ∞ stop —
 * so dragging right always means "stays longer".
 */
export function AiReplyDurationPicker({ value, onChange }: Props) {
  const t = useTranslations('Preferences');

  // Defensive max(0, …): an out-of-set value (legacy / corrupt) falls back to
  // the first slider stop rather than a -1 index.
  const index = Math.max(0, AI_REPLY_DURATION_SLIDER_ORDER.indexOf(value));
  const { key, params } = aiReplyDurationLabel(value);
  // Full localized label for assistive tech (e.g. "Keep visible" / "5s"); the
  // visible readout stays compact (∞ / "5s") so it never crowds the slider.
  const fullLabel = t(`game.${key}`, params);
  const readout =
    value === AI_REPLY_DURATION_KEEP
      ? '∞'
      : t('game.aiReplyDurationModes.seconds', { seconds: value / 1000 });

  return (
    <div className="flex w-full items-center justify-between gap-3 text-sm text-foreground">
      <span className="flex items-center gap-1.5">
        <FaClock className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">{t('game.aiReplyDuration')}</span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={AI_REPLY_DURATION_SLIDER_ORDER.length - 1}
          step={1}
          value={index}
          onChange={(e) => onChange(AI_REPLY_DURATION_SLIDER_ORDER[Number(e.target.value)])}
          aria-label={t('game.aiReplyDuration')}
          aria-valuetext={fullLabel}
          className="h-2 w-28 cursor-pointer appearance-none rounded-md bg-secondary accent-foreground"
        />
        <span
          className="w-8 shrink-0 text-right tabular-nums text-muted-foreground"
          title={fullLabel}
        >
          {readout}
        </span>
      </div>
    </div>
  );
}

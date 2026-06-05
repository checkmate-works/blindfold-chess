'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { AiReplyDuration } from '@/lib/games/ai-reply-duration';
import { AI_REPLY_DURATION_KEEP, AI_REPLY_DURATION_VALUES } from '@/lib/games/ai-reply-duration';

type Props = {
  value: AiReplyDuration;
  onChange: (value: AiReplyDuration) => void;
};

/**
 * Radio row choosing how long the on-board AI-reply chip keeps the opponent's
 * last move visible in blindfold modes: a few presets plus "keep visible"
 * (`AI_REPLY_DURATION_KEEP`), which restores the historical behavior of leaving
 * the move up until the player responds. Global-only — rendered on the
 * Preferences "Game" tab, not in the per-game new-game / mid-game forms, so it
 * always writes the global default regardless of `boardVisibility`.
 */
export function AiReplyDurationPicker({ value, onChange }: Props) {
  const t = useTranslations('Preferences');

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{t('game.aiReplyDuration')}</h4>
      <p className="text-xs text-muted-foreground mb-3">{t('game.aiReplyDurationHint')}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {AI_REPLY_DURATION_VALUES.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
          >
            <input
              type="radio"
              name="aiReplyDuration"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <span>
              {option === AI_REPLY_DURATION_KEEP
                ? t('game.aiReplyDurationModes.keep')
                : t('game.aiReplyDurationModes.seconds', { seconds: option / 1000 })}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

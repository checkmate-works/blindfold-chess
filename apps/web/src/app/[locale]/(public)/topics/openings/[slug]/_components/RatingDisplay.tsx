'use client';

import { useTranslations } from 'next-intl';

type Props = {
  preferenceRating: number | null;
  proficiencyRating: number | null;
};

function RatingStars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-xs ${i < value ? 'text-amber-500' : 'text-muted-foreground/30'}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function RatingDisplay({ preferenceRating, proficiencyRating }: Props) {
  const t = useTranslations('topics.openings.ratings');

  if (preferenceRating === null && proficiencyRating === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {preferenceRating !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>{t('preference')}</span>
          <RatingStars value={preferenceRating} />
        </span>
      )}
      {proficiencyRating !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>{t('proficiency')}</span>
          <RatingStars value={proficiencyRating} />
        </span>
      )}
    </div>
  );
}

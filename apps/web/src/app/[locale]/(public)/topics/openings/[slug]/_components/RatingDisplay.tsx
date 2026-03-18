'use client';

import { useTranslations } from 'next-intl';

import { RatingFaceIcon } from '@blindfold-chess/icons';
import type { RatingFaceLevel } from '@blindfold-chess/icons';

const RATING_FACE_COLORS: Record<RatingFaceLevel, string> = {
  1: '#7C3AED',
  2: '#60A5FA',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#EC4899',
};

type Props = {
  preferenceRating: number | null;
  proficiencyRating: number | null;
};

function RatingFaces({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {([1, 2, 3, 4, 5] as const).map((level) => {
        const isActive = level === value;
        return (
          <span key={level} className={isActive ? 'opacity-100' : 'opacity-30'}>
            <RatingFaceIcon
              level={level as RatingFaceLevel}
              size={16}
              faceColor={isActive ? RATING_FACE_COLORS[level] : undefined}
            />
          </span>
        );
      })}
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
          <RatingFaces value={preferenceRating} />
        </span>
      )}
      {proficiencyRating !== null && (
        <span className="inline-flex items-center gap-1.5">
          <span>{t('proficiency')}</span>
          <RatingFaces value={proficiencyRating} />
        </span>
      )}
    </div>
  );
}

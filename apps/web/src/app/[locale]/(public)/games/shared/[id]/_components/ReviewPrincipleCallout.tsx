'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLightbulb } from 'react-icons/fa';

import type { PrincipleId } from '@/lib/ai-review/principles';

/**
 * The general rule a critical moment illustrates, as a callout between the
 * review's explanation and its lesson.
 *
 * The name and definition come from the message files, not from the review:
 * a principle is an id the model picked from a closed list (see
 * `@/lib/ai-review/principles`), so this is the one part of a review that
 * reads in the VIEWER's language even when the prose was generated in
 * another. Renders nothing for `other`, which names no rule.
 */
export function ReviewPrincipleCallout({ principle }: { principle: PrincipleId }) {
  const t = useTranslations('sharedGames');
  if (principle === 'other') return null;

  return (
    <div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
      <FaLightbulb aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
      <div className="min-w-0 text-sm">
        <span className="sr-only">{t('aiReview.principleLabel')}: </span>
        <span className="font-medium text-foreground">
          {t(`aiReview.principles.${principle}.name`)}
        </span>
        <p className="text-muted-foreground">{t(`aiReview.principles.${principle}.definition`)}</p>
      </div>
    </div>
  );
}

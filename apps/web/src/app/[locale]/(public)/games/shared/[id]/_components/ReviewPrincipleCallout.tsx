'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLightbulb } from 'react-icons/fa';

import type { PrincipleId } from '@/lib/ai-review/principles';
import { glossarySlugOf } from '@/lib/ai-review/principles';

import { useTermModal } from '@/app/[locale]/_components/glossary-term/GlossaryTermModalProvider';
import { TermLink } from '@/app/[locale]/_components/glossary-term/TermLink';

/**
 * The general rule a critical moment illustrates, as a labelled glossary
 * link between the review's explanation and its lesson.
 *
 * A principle is a glossary term (see `@/lib/ai-review/principles`), so this
 * reads like the term links in a guide: the name comes from the glossary in
 * the VIEWER's language whatever the review's, a click opens the shared
 * preview modal, and the link itself leads to the term's page. The
 * definition is deliberately not repeated inline — it is the same text on
 * every review, and the modal is one tap away.
 *
 * Renders nothing for `other` (no rule) and when the page did not embed a
 * preview for the term (a term removed from the glossary), the same
 * degrade-to-nothing posture the guides take.
 */
export function ReviewPrincipleCallout({ principle }: { principle: PrincipleId }) {
  const t = useTranslations('sharedGames');
  const slug = glossarySlugOf(principle);
  const term = useTermModal()?.getTerm(slug ?? '');
  if (!slug || !term) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm">
      <FaLightbulb aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      <span className="text-muted-foreground">{t('aiReview.principleLabel')}:</span>
      <TermLink slug={slug} href={term.href}>
        {term.name}
      </TermLink>
    </p>
  );
}

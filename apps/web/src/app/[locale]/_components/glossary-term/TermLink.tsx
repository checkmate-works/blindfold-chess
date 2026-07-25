'use client';

import type { ReactNode } from 'react';

import { FOCUS_RING_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useTermModal } from './GlossaryTermModalProvider';

type Props = {
  /** Canonical term slug this link resolves to. */
  slug: string;
  /** Fallback destination (the single-term page) used when JS is off or the term is unknown. */
  href: string;
  /** The prose surface text (e.g. "Tabia"). */
  children: ReactNode;
};

/**
 * Inline, progressively-enhanced glossary term link.
 *
 * Always renders a real `<a href>` (crawlable, and it still navigates to the
 * term page if JavaScript is unavailable). When a {@link
 * GlossaryTermModalProvider} above it knows the slug, a primary click instead
 * opens the shared preview modal. Modified / non-primary clicks
 * (cmd/ctrl/shift/alt, middle-click) always fall through to normal
 * navigation so "open in new tab" keeps working.
 */
export function TermLink({ slug, href, children }: Props) {
  const ctx = useTermModal();
  const interactive = ctx?.hasTerm(slug) ?? false;

  return (
    <a
      href={href}
      data-glossary-term={slug}
      className={`font-medium text-link-primary underline decoration-dotted underline-offset-2 hover:decoration-solid ${FOCUS_RING_CLASSES}`}
      onClick={(e) => {
        if (!interactive) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        ctx?.openTerm(slug);
      }}
    >
      {children}
    </a>
  );
}

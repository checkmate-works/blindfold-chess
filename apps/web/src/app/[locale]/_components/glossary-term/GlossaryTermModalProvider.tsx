'use client';

import { type ReactNode, createContext, useContext, useMemo, useState } from 'react';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { Modal } from '../Modal';
import type { TermPreview } from './types';

type TermModalContextValue = {
  /** Open the preview modal for `slug`; a no-op if the slug is unknown. */
  openTerm: (slug: string) => void;
  /** Whether a preview exists for `slug` (drives TermLink interactivity). */
  hasTerm: (slug: string) => boolean;
};

const TermModalContext = createContext<TermModalContextValue | null>(null);

/**
 * Access the nearest term-modal controller. Returns `null` when a
 * {@link TermLink} is rendered outside any provider — in that case the link
 * falls back to plain navigation.
 */
export function useTermModal(): TermModalContextValue | null {
  return useContext(TermModalContext);
}

type Props = {
  /** Preview data for every term the wrapped content links, keyed by slug. */
  terms: Record<string, TermPreview>;
  /** Localized "View details" label for the modal's out-link. */
  viewDetailsLabel: string;
  children: ReactNode;
};

/**
 * Holds a single shared preview modal for all {@link TermLink}s in its
 * subtree. Instead of one modal per link, TermLinks dispatch `openTerm(slug)`
 * and this provider renders exactly one dialog, reading the term data from
 * the `terms` map that was serialized into the SSR HTML — so opening a term
 * needs no client fetch.
 */
export function GlossaryTermModalProvider({ terms, viewDetailsLabel, children }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const value = useMemo<TermModalContextValue>(
    () => ({
      openTerm: (slug) => {
        if (terms[slug]) setActiveSlug(slug);
      },
      hasTerm: (slug) => Boolean(terms[slug]),
    }),
    [terms]
  );

  const active = activeSlug ? (terms[activeSlug] ?? null) : null;

  return (
    <TermModalContext.Provider value={value}>
      {children}
      <Modal
        isOpen={active !== null}
        title={active?.name}
        onClose={() => setActiveSlug(null)}
        trapFocus
        maxWidth="max-w-md"
      >
        {active && (
          <div className="space-y-4">
            {active.reading && <p className="text-sm text-muted-foreground">{active.reading}</p>}
            <p className="whitespace-pre-line leading-relaxed text-foreground/80">
              {active.definition}
            </p>
            <a
              href={active.href}
              className={`inline-flex items-center gap-1 text-sm ${TEXT_LINK_CLASSES}`}
            >
              {viewDetailsLabel}
              <span aria-hidden>→</span>
            </a>
          </div>
        )}
      </Modal>
    </TermModalContext.Provider>
  );
}

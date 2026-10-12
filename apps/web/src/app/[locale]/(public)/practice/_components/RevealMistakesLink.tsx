'use client';

import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { hasMistakeReveal, revealMistakes, subscribeMistakeReveal } from '../_lib/mistake-reveal';

/**
 * The score summary's "Incorrect" count, as a link that opens the missed
 * problems in the problem list below and scrolls there.
 *
 * The list sits under the EXP card and the sign-up banner or record
 * section, out of view on a phone; this connects the count to it.
 *
 * Until a list registers (`useMistakeReveal`) — on the server render, and on
 * every module without a problem list — it renders as plain text, so there
 * is never a link that does nothing.
 */
export function RevealMistakesLink({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeMistakeReveal, hasMistakeReveal, () => false);

  if (!ready) return <span>{children}</span>;

  return (
    <button type="button" onClick={revealMistakes} className={TEXT_LINK_CLASSES}>
      {children}
    </button>
  );
}

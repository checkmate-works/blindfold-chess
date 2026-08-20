import type { ReactNode } from 'react';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  /** Section heading above the card (the module's `howToPlayTitle`). */
  title: string;
  /** Lead paragraph inside the card (the module's `howToPlayDescription`). */
  description: string;
  /** The demo content rendered below the description (board, pieces, etc.). */
  children: ReactNode;
  /**
   * Bottom-margin utility for the card wrapper. Defaults to `mb-6`; pass
   * `mb-2` when a tutorial link follows the card directly.
   */
  marginClassName?: string;
  /**
   * `'card'` (default) frames the content in a bordered card. `'plain'` drops
   * the border and card background so the demo reads as part of the page —
   * useful when the frame competes with the demo it is supposed to showcase.
   */
  variant?: 'card' | 'plain';
};

const VARIANT_CLASSNAMES = {
  card: 'rounded-xl border border-border bg-card p-6',
  plain: 'px-2 py-4',
} as const;

/**
 * The shared "how to play" section every challenge setup screen renders: a
 * `SectionTitle`, then the description plus a module-specific demo (the
 * `children`), optionally framed as a bordered card. Each setup supplies only
 * its title, description, and demo.
 */
export function PracticeHowToPlayCard({
  title,
  description,
  children,
  marginClassName = 'mb-6',
  variant = 'card',
}: Props) {
  return (
    <>
      <SectionTitle className="mb-4">{title}</SectionTitle>
      <div className={`${marginClassName} ${VARIANT_CLASSNAMES[variant]} text-center`}>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {children}
      </div>
    </>
  );
}

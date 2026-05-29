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
};

/**
 * The shared "how to play" card every challenge setup screen renders: a
 * `SectionTitle`, then a bordered card holding the description plus a
 * module-specific demo (the `children`). Each setup supplies only its title,
 * description, and demo.
 */
export function PracticeHowToPlayCard({
  title,
  description,
  children,
  marginClassName = 'mb-6',
}: Props) {
  return (
    <>
      <SectionTitle className="mb-4">{title}</SectionTitle>
      <div className={`${marginClassName} rounded-xl border border-border bg-card p-6 text-center`}>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {children}
      </div>
    </>
  );
}

import type { ReactNode } from 'react';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  /** Section heading (the module's `howToPlayTitle`). */
  title: string;
  /** Lead paragraph above the demo (the module's `howToPlayDescription`). */
  description: string;
  /** The demo content rendered below the description (board, pieces, etc.). */
  children: ReactNode;
  /**
   * Bottom-margin utility for the section wrapper. Defaults to `mb-6`; pass
   * `mb-2` when a tutorial link follows the section directly.
   */
  marginClassName?: string;
};

/**
 * The shared "how to play" section every challenge setup screen renders: a
 * `SectionTitle`, then the description plus a module-specific demo (the
 * `children`). Each setup supplies only its title, description, and demo.
 *
 * The section is deliberately unframed. It used to sit inside a bordered card,
 * but the frame drew the eye to itself and boxed in demos that are already
 * visually distinct — a board, piece glyphs, answer buttons — making them
 * harder to read rather than easier.
 */
export function PracticeHowToPlaySection({
  title,
  description,
  children,
  marginClassName = 'mb-6',
}: Props) {
  return (
    <>
      <SectionTitle className="mb-4">{title}</SectionTitle>
      <div className={`${marginClassName} py-2 text-center`}>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {children}
      </div>
    </>
  );
}

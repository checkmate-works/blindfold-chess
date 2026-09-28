'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfinity } from 'react-icons/fa';

import { Divider } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * A module's training URL. The fragment is the id `useTrainingSessionShell`
 * gives the session element, so the page opens scrolled to the board rather
 * than to the breadcrumb above it.
 */
export function trainingHrefFor(locale: Locale, moduleSlug: string, query?: string): string {
  const qs = query ? `?${query}` : '';
  return `/${locale}/practice/${moduleSlug}/training${qs}#${moduleSlug}-training-session`;
}

type Props = {
  /** The module's training URL, carrying whatever settings the screen chose. */
  href: string;
  /** Classes for the button. Defaults to `w-full`. */
  buttonClassName?: string;
  /** `data-tour-id` attribute for the button (used by `HelpTourButton`). */
  tourId?: string;
};

/**
 * The "or" divider and the outlined training button that follow a primary
 * challenge button. Training is the secondary path on every screen that
 * offers both, so it always comes second and never takes the primary fill.
 */
export function TrainingModeButton({ href, buttonClassName, tourId }: Props) {
  const tp = useTranslations('practice');

  return (
    <>
      <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{tp('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      {/* Block, not the anchor's default inline: on the challenge setup screen
          this is the last thing before the related-practice section, and the
          panel spaces its children with `margin-block-end`, which an inline
          box ignores — the section's heading sat flush against the button. */}
      <Link href={href} data-tour-id={tourId} className="block">
        <Button
          asChild
          variant="outline"
          size="lg"
          icon={<FaInfinity />}
          className={buttonClassName ?? 'w-full'}
        >
          {tp('startTraining')}
        </Button>
      </Link>
    </>
  );
}

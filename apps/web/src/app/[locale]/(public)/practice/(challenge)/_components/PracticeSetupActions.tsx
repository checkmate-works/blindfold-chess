'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  moduleSlug: string;
  /** Query string to append to challenge and training URLs (without leading '?') */
  settingsQuery?: string;
  /** Override the default training href. Defaults to `/${locale}/practice/${moduleSlug}/training` */
  trainingHref?: string;
  /** Additional CSS class for the start button */
  buttonClassName?: string;
};

export function PracticeSetupActions({
  locale,
  moduleSlug,
  settingsQuery,
  trainingHref,
  buttonClassName,
}: Props) {
  const tp = useTranslations('practice');

  const qs = settingsQuery ? `?${settingsQuery}` : '';
  const challengeHref = `/${locale}/practice/${moduleSlug}/challenge/session${qs}`;
  const trainingLink =
    trainingHref ??
    `/${locale}/practice/${moduleSlug}/training${qs}#${moduleSlug}-training-session`;

  return (
    <>
      <Link href={challengeHref}>
        <Button
          asChild
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className={buttonClassName ?? 'w-full'}
        >
          {tp('startChallenge')}
        </Button>
      </Link>
      <div className="mt-4 text-center">
        <Link
          href={trainingLink}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('switchToTraining')}
        </Link>
      </div>
    </>
  );
}

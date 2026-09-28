'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

import { TrainingModeButton, trainingHrefFor } from './TrainingModeButton';

type Props = {
  locale: Locale;
  moduleSlug: string;
  /** Query string to append to challenge and training URLs (without leading '?') */
  settingsQuery?: string;
  /** Override the default challenge href. Defaults to `/${locale}/practice/${moduleSlug}/challenge/session` */
  challengeHref?: string;
  /** Override the default training href. Defaults to `/${locale}/practice/${moduleSlug}/training` */
  trainingHref?: string;
  /** Additional CSS class for the start button */
  buttonClassName?: string;
  /** `data-tour-id` attribute for the challenge button (used by `HelpTourButton`). */
  challengeTourId?: string;
  /** `data-tour-id` attribute for the training button (used by `HelpTourButton`). */
  trainingTourId?: string;
};

export function PracticeSetupActions({
  locale,
  moduleSlug,
  settingsQuery,
  challengeHref,
  trainingHref,
  buttonClassName,
  challengeTourId,
  trainingTourId,
}: Props) {
  const tp = useTranslations('practice');

  const qs = settingsQuery ? `?${settingsQuery}` : '';
  const challengeLink = challengeHref ?? `/${locale}/practice/${moduleSlug}/challenge/session${qs}`;
  const trainingLink = trainingHref ?? trainingHrefFor(locale, moduleSlug, settingsQuery);

  return (
    <>
      <Link href={challengeLink} data-tour-id={challengeTourId}>
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

      <TrainingModeButton
        href={trainingLink}
        tourId={trainingTourId}
        {...(buttonClassName ? { buttonClassName } : {})}
      />
    </>
  );
}

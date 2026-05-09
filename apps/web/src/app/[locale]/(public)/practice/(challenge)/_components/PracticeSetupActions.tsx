'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfinity, FaPlay } from 'react-icons/fa';

import { Divider } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  const trainingLink =
    trainingHref ??
    `/${locale}/practice/${moduleSlug}/training${qs}#${moduleSlug}-training-session`;

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

      <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{tp('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <Link href={trainingLink} data-tour-id={trainingTourId}>
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

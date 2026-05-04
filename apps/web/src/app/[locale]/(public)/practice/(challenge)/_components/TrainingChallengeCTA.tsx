'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfinity, FaPlay } from 'react-icons/fa';

type Props = {
  challengeHref: string;
};

export function TrainingChallengeCTA({ challengeHref }: Props) {
  const tp = useTranslations('practice');

  return (
    <>
      <hr className="border-border mt-8" />
      <div className="mt-6 text-center">
        <p className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <FaInfinity className="h-3 w-3" />
          {tp('trainingModeActive')}
        </p>
        <p className="mt-2 text-base font-medium text-foreground">{tp('readyForChallenge')}</p>
        <div className="mt-4">
          <Link href={challengeHref}>
            <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
              {tp('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

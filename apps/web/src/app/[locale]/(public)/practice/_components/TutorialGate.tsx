'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIP_CONFIG, type TutorialSkipModuleId } from '../_lib/tutorial-skip-config';

type Props = {
  locale: Locale;
  moduleId: TutorialSkipModuleId;
  children: ReactNode;
  /**
   * Optional placeholder shown while the tutorial-skipped flag is being read
   * from localStorage on mount, and while the redirect is in flight.
   * Defaults to `null` (renders nothing).
   */
  fallback?: ReactNode;
};

/**
 * Client-side gate for practice setup pages. On mount it reads the module's
 * tutorial-skipped flag from localStorage; if the user has not yet skipped
 * (or finished) the tutorial they are redirected to the module tutorial.
 * Otherwise the gate renders its children.
 */
export function TutorialGate({ locale, moduleId, children, fallback = null }: Props) {
  const router = useRouter();
  const { storageKey, redirectPath } = TUTORIAL_SKIP_CONFIG[moduleId];
  const [tutorialSkipped, setTutorialSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    const skipped = localStorage.getItem(storageKey) === 'true';
    setTutorialSkipped(skipped);
  }, [storageKey]);

  useEffect(() => {
    if (tutorialSkipped === false) {
      router.replace(`/${locale}/practice/${redirectPath}/tutorial`);
    }
  }, [tutorialSkipped, locale, redirectPath, router]);

  if (tutorialSkipped === null || tutorialSkipped === false) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

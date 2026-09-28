'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

import { TrainingModeButton } from './TrainingModeButton';

type ChallengeSetupShellProps = {
  /** The `<li>` rule items rendered in the bullet list above the button. */
  rules: React.ReactNode;
  onStart: () => void;
  /**
   * The module's training URL, built from the same settings the challenge
   * would start with. Most arrivals here are not from the module page — the
   * leaderboard, a finished or abandoned session and the tutorial all link
   * straight to this screen — so it offers training itself rather than
   * making the reader go back a page to find it.
   */
  trainingHref: string;
  /**
   * Optional settings widget rendered between the rules and the start
   * button. When present, the button gains a top margin to separate it.
   */
  children?: React.ReactNode;
};

/**
 * Shared scaffolding for the per-module challenge setup screens: the section
 * title, the rules bullet list, an optional settings widget, the start
 * button, and the training button under it. Each module supplies only its
 * rules, its `onStart` handler, its training URL, and (optionally) its
 * settings widget.
 */
export function ChallengeSetupShell({
  rules,
  onStart,
  trainingHref,
  children,
}: ChallengeSetupShellProps) {
  const t = useTranslations('practice');

  return (
    <>
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        {rules}
      </ul>

      {children}

      <Button
        onClick={onStart}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className={children ? 'w-full mt-6' : 'w-full'}
      >
        {t('startChallenge')}
      </Button>

      <TrainingModeButton href={trainingHref} />
    </>
  );
}

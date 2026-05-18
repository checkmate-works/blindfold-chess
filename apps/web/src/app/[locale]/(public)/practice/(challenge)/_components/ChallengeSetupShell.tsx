'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

type ChallengeSetupShellProps = {
  /** The `<li>` rule items rendered in the bullet list above the button. */
  rules: React.ReactNode;
  onStart: () => void;
  /**
   * Optional settings widget rendered between the rules and the start
   * button. When present, the button gains a top margin to separate it.
   */
  children?: React.ReactNode;
};

/**
 * Shared scaffolding for the per-module challenge setup screens: the section
 * title, the rules bullet list, an optional settings widget, and the start
 * button. Each module supplies only its rules, its `onStart` handler, and
 * (optionally) its settings widget.
 */
export function ChallengeSetupShell({ rules, onStart, children }: ChallengeSetupShellProps) {
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
    </>
  );
}

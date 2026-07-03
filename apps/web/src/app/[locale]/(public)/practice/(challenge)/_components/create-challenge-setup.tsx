'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Locale } from '@/app/[locale]/_lib/types';

import { ChallengeSetupShell } from './ChallengeSetupShell';

type PracticeTranslator = ReturnType<typeof useTranslations>;

type CreateChallengeSetupOptions = {
  /** Kebab-case module slug used to build the challenge session URL. */
  moduleSlug: string;
  /** Optional query params appended to the session URL on start. */
  buildQuery?: () => URLSearchParams;
  /** Renders the `<li>` rule items, given the `practice` translator. */
  rules: (t: PracticeTranslator) => React.ReactNode;
};

type ChallengeSetupProps = {
  locale: Locale;
};

/**
 * Factory for the config-only challenge setup screens: each produced component
 * wires the shared boilerplate (practice translator + router push to the
 * module's `challenge/session` URL) around {@link ChallengeSetupShell}.
 *
 * Only modules whose setup is pure config (rules list + optional fixed query
 * params) use this factory. Modules with real per-module settings UI (piece
 * pickers, orientation selectors, feedback speed, ...) keep hand-written
 * setup components that render their settings widget as the shell's children.
 */
export function createChallengeSetup({
  moduleSlug,
  buildQuery,
  rules,
}: CreateChallengeSetupOptions) {
  return function ChallengeSetup({ locale }: ChallengeSetupProps) {
    const t = useTranslations('practice');
    const router = useRouter();

    const handleStart = () => {
      const query = buildQuery?.();
      const search = query ? `?${query.toString()}` : '';
      router.push(`/${locale}/practice/${moduleSlug}/challenge/session${search}`);
    };

    return <ChallengeSetupShell onStart={handleStart} rules={rules(t)} />;
  };
}

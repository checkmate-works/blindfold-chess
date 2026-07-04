import { getTranslations } from 'next-intl/server';

import { FormErrorBanner } from '@/app/_components/FormErrorBanner';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  namespace: 'signIn' | 'signUp';
  locale: Locale;
};

export async function AuthErrorMessage({ namespace, locale }: Props) {
  // Accepts `locale` as a prop rather than resolving it internally via
  // `getTranslations(namespace)` (bare shorthand — no explicit locale): both
  // callers already have `locale` from their own `params`, and the bare form
  // resolves the same unreliable way `getLocale()` does outside a page's own
  // params (see getLocaleFromPathnameHeader's TSDoc).
  const t = await getTranslations({ locale, namespace });

  return (
    <div className="max-w-sm mx-auto mb-4">
      <FormErrorBanner variant="bordered" message={t('authError')} />
    </div>
  );
}

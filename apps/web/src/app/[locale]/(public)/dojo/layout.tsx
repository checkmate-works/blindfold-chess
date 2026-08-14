import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Serves the 'dojo' client dictionary (guides, ranks, dojo hub — see
 * `@/app/[locale]/_lib/i18n-scopes`) for the whole belt-progression
 * namespace. GamePreferences stays where it was: the nested
 * `guides/layout.tsx` and `ranks/layout.tsx` mount it for the subtrees that
 * render boards; the hub page does not need it.
 */
export default async function DojoLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ScopedIntlProvider scope="dojo" locale={locale}>
      {children}
    </ScopedIntlProvider>
  );
}

import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Serves the 'dojoExams' client dictionary (see
 * `@/app/[locale]/_lib/i18n-scopes`). The exam problems run the practice
 * sessions, so they need the practice strings; giving the exams their own
 * scope keeps those strings off the rest of /dojo. The board-theme
 * preferences still come from the dojo layout above.
 */
export default async function DojoExamsLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ScopedIntlProvider scope="dojoExams" locale={locale}>
      {children}
    </ScopedIntlProvider>
  );
}

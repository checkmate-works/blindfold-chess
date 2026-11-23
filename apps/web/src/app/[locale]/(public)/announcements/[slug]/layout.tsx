import { ScopedIntlProvider } from '@/app/_layouts/scoped-intl-layout';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Subtree provider for the 'announcementDetail' client dictionary (see
 * `@/app/[locale]/_lib/i18n-scopes`): the like button and its guest sign-in
 * prompt, without shipping a larger scope's dictionary to this page.
 */
export default async function AnnouncementDetailLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ScopedIntlProvider scope="announcementDetail" locale={locale}>
      {children}
    </ScopedIntlProvider>
  );
}

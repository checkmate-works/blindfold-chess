import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResendEmailButton } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'verifyEmail' });

  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'sign-up/verify-email', title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { email } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'verifyEmail' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel className="space-y-6">
        <div className="text-center space-y-3">
          <p className="text-foreground">{t('description')}</p>
          <p className="text-sm text-muted-foreground">{t('checkInbox')}</p>
        </div>

        <div className="text-center">
          <ResendEmailButton email={email ?? ''} />
        </div>

        <Breadcrumb
          items={[{ label: t('breadcrumbSignUp'), href: '/sign-up' }, { label: t('title') }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}

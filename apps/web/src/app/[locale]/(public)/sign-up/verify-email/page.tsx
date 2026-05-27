import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResendEmailButton } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'verifyEmail',
    path: 'sign-up/verify-email',
    omitDescription: true,
  });
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { email } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'verifyEmail' });

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbSignUp'), href: '/sign-up' }, { label: t('title') }]}
      divider={false}
      panelClassName="space-y-6"
    >
      <div className="text-center space-y-3">
        <p className="text-foreground">{t('description')}</p>
        <p className="text-sm text-muted-foreground">{t('checkInbox')}</p>
      </div>

      <div className="text-center">
        <ResendEmailButton email={email ?? ''} />
      </div>
    </PageLayout>
  );
}

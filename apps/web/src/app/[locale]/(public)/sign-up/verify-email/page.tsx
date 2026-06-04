import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
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
  const tSignUp = await getTranslations({ locale, namespace: 'signUp' });

  return (
    <PageLayout
      title={
        <>
          {tSignUp('title')}
          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success align-middle">
            {tSignUp('freeBadge')}
          </span>
        </>
      }
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbSignUp'), href: '/sign-up' }, { label: t('title') }]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-foreground">{t('description')}</p>
          <p className="text-sm text-muted-foreground">{t('checkInbox')}</p>
          <p className="text-sm text-muted-foreground">{t('checkSpam')}</p>
        </div>

        <ResendEmailButton email={email ?? ''} />
      </div>
    </PageLayout>
  );
}

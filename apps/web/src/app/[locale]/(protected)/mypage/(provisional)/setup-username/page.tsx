import { getTranslations } from 'next-intl/server';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { UsernameForm } from './_components';

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.setupUsername',
    path: 'mypage/setup-username',
    noIndex: true,
  });
}

export default async function SetupUsernamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'setupUsername' });
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
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>
      <UsernameForm locale={locale} />
    </PageLayout>
  );
}

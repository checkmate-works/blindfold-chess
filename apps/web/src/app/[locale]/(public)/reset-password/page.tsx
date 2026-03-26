import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ResetPasswordForm } from './_components';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resetPassword' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'reset-password' }),
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resetPassword' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <p className="text-center text-sm text-muted-foreground">{t('description')}</p>
        <ResetPasswordForm />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ResetPasswordForm } from './_components';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resetPassword' });

  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'reset-password', title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resetPassword' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <p className="text-center text-sm text-muted-foreground">{t('description')}</p>
      <ResetPasswordForm />
    </PageLayout>
  );
}

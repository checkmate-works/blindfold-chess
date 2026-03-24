import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';
import { Link } from '@/i18n/routing';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ForgotPasswordForm } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forgotPassword' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'forgot-password' }),
    title: t('title'),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forgotPassword' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/sign-in" locale={locale} className="text-link-primary hover:underline">
            {t('backToSignIn')}
          </Link>
        </p>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}

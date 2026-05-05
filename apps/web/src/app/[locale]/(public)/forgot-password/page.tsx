import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ForgotPasswordForm } from './_components';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forgotPassword' });

  const title = t('title');

  return {
    ...generateCanonicalMetadata({ locale, path: 'forgot-password', title }),
    title: resolveTitle(title, locale),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forgotPassword' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/sign-in" locale={locale} className={TEXT_LINK_CLASSES}>
          {t('backToSignIn')}
        </Link>
      </p>
    </PageLayout>
  );
}

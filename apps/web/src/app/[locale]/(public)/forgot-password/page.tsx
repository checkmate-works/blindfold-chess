import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ForgotPasswordForm } from './_components';

export const generateStaticParams = generateLocaleStaticParams;

/**
 * Credential-entry surface: deliberately opted OUT of static generation so it
 * keeps the per-request-nonce `'strict-dynamic'` CSP (`src/proxy.ts` serves
 * prerendered content routes a weaker `'unsafe-inline'` script-src, which is
 * the wrong trade for a page that handles account credentials). The
 * `generateStaticParams` export above still feeds the `[locale]` layout.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'forgotPassword',
    path: 'forgot-password',
    omitDescription: true,
  });
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

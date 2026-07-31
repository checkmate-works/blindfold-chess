import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { LocalePageProps as Props } from '@/app/[locale]/_lib/types';

import { ResetPasswordForm } from './_components';

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
    namespace: 'resetPassword',
    path: 'reset-password',
    omitDescription: true,
  });
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

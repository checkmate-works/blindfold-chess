import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { Divider, PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';

import { AuthErrorMessage } from '../_components/AuthErrorMessage';
import { GoogleOAuthButton } from '../_components/GoogleOAuthButton';
import { type AuthPageProps, resolveAuthPageEntry } from '../_lib/auth-page-entry';
import { EmailPasswordForm } from './_components';

type Props = AuthPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.signIn',
    path: 'sign-in',
    noIndex: true,
  });
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale, error, next } = await resolveAuthPageEntry({ params, searchParams });

  const t = await getTranslations({ locale, namespace: 'signIn' });

  return (
    <PageLayout title={t('title')} locale={locale} breadcrumb={[{ label: t('title') }]}>
      {error && <AuthErrorMessage namespace="signIn" locale={locale} />}

      <div>
        <GoogleOAuthButton namespace="signIn" next={next ?? undefined} />
      </div>

      <div className="flex items-center gap-4 max-w-sm mx-auto">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{t('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <EmailPasswordForm next={next ?? undefined} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : '/sign-up'}
          locale={locale}
          className={TEXT_LINK_CLASSES}
        >
          {t('signUp')}
        </Link>
      </p>
    </PageLayout>
  );
}

/**
 * Sign Up Page
 *
 * @description
 * Registration page using Google OAuth or email/password.
 * Since OAuth treats sign-up and sign-in as the same operation (signInWithOAuth),
 * existing users authenticating from this page are silently logged in.
 * This is industry-standard behavior and also prevents account enumeration attacks.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { Divider, PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';

import { AuthErrorMessage } from '../_components/AuthErrorMessage';
import { GoogleOAuthButton } from '../_components/GoogleOAuthButton';
import { type AuthPageProps, resolveAuthPageEntry } from '../_lib/auth-page-entry';
import { EmailSignUpForm, FeatureCardsSection } from './_components';

type Props = AuthPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.signUp',
    path: 'sign-up',
    noIndex: true,
  });
}

export default async function SignUpPage({ params, searchParams }: Props) {
  const { locale, error, next } = await resolveAuthPageEntry({ params, searchParams });

  const t = await getTranslations({ locale, namespace: 'signUp' });

  return (
    <PageLayout
      title={
        <>
          {t('title')}
          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success align-middle">
            {t('freeBadge')}
          </span>
        </>
      }
      locale={locale}
      breadcrumb={[{ label: t('title') }]}
    >
      {error && <AuthErrorMessage namespace="signUp" locale={locale} />}

      <div>
        <GoogleOAuthButton namespace="signUp" next={next ?? undefined} />
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        <span aria-hidden="true" className="text-success">
          &#x2713;
        </span>{' '}
        {t('freeAssurance')}
      </p>

      <div className="flex items-center gap-4 max-w-sm mx-auto">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{t('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <EmailSignUpForm next={next ?? undefined} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('alreadyHaveAccount')}{' '}
        <Link
          href={next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in'}
          locale={locale}
          className={TEXT_LINK_CLASSES}
        >
          {t('signIn')}
        </Link>
      </p>

      <FeatureCardsSection t={t} />
    </PageLayout>
  );
}

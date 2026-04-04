/**
 * Sign Up Page (アカウント登録)
 *
 * @description
 * Registration page using Google OAuth or email/password.
 * Since OAuth treats sign-up and sign-in as the same operation (signInWithOAuth),
 * existing users authenticating from this page are silently logged in.
 * This is industry-standard behavior and also prevents account enumeration attacks.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AuthErrorMessage } from '../_components/AuthErrorMessage';
import { GoogleOAuthButton } from '../_components/GoogleOAuthButton';
import { EmailSignUpForm, FeatureCardsSection } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.signUp' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'sign-up', title, description }),
    title: resolveTitle(title, locale),
    description,
    robots: { index: false, follow: false },
  };
}

export default async function SignUpPage({ params, searchParams }: Props) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase environment variables are not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/mypage?toast=already_logged_in`);
  }

  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'signUp' });

  return (
    <div className="space-y-8">
      <PageTitle>
        {t('title')}
        <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success align-middle">
          {t('freeBadge')}
        </span>
      </PageTitle>

      <PagePanel>
        {error && <AuthErrorMessage namespace="signUp" />}

        <div>
          <GoogleOAuthButton namespace="signUp" />
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

        <EmailSignUpForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/sign-in" locale={locale} className="text-link-primary hover:underline">
            {t('signIn')}
          </Link>
        </p>

        <FeatureCardsSection t={t} />

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}

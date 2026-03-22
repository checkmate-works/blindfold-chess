import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AuthErrorMessage } from '../_components/AuthErrorMessage';
import { GoogleOAuthButton } from '../_components/GoogleOAuthButton';
import { EmailPasswordForm } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.signIn' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'sign-in' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function SignInPage({ params, searchParams }: Props) {
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
  const t = await getTranslations({ locale, namespace: 'signIn' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        {error && <AuthErrorMessage namespace="signIn" />}

        <div>
          <GoogleOAuthButton namespace="signIn" />
        </div>

        <div className="flex items-center gap-4 max-w-sm mx-auto">
          <Divider className="flex-1" />
          <span className="text-sm text-muted-foreground">{t('orDivider')}</span>
          <Divider className="flex-1" />
        </div>

        <EmailPasswordForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/sign-up" locale={locale} className="text-link-primary hover:underline">
            {t('signUp')}
          </Link>
        </p>

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}

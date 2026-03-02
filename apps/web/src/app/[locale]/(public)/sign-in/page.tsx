import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { AuthErrorMessage } from './_components/AuthErrorMessage';
import { GoogleSignInButton } from './_components/GoogleSignInButton';

type Props = {
  params: Promise<{ locale: string }>;
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
    <>
      <PageTitle>{t('title')}</PageTitle>
      {error && <AuthErrorMessage />}
      <div className="mt-8">
        <GoogleSignInButton />
      </div>
    </>
  );
}

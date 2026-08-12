import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { resolveReturnPath } from '@/lib/auth-return-path';
import { createClient } from '@/lib/supabase/server';

import { Divider, PageLayout } from '@/app/[locale]/_components';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AuthErrorMessage } from '../_components/AuthErrorMessage';
import { GoogleOAuthButton } from '../_components/GoogleOAuthButton';
import { EmailPasswordForm } from './_components';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string; next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.signIn',
    path: 'sign-in',
    noIndex: true,
  });
}

export default async function SignInPage({ params, searchParams }: Props) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase environment variables are not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const { locale } = await params;

  const { error, next: nextRaw } = await searchParams;
  // Where to land after signing in (a CTA-gated page passes its own URL).
  // Validated to an internal path to prevent open redirects.
  const next = resolveReturnPath(nextRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? `/${locale}/mypage?toast=already_logged_in`);
  }

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

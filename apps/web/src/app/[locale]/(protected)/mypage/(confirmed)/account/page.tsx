/**
 * Account (アカウント)
 *
 * @description
 * The account as the unit of signing in: the email address and its change,
 * the login methods (email + password / Google / Apple) with add and remove,
 * and the entry to account deletion. Distinct from `/mypage/profile`, which is
 * the self the user shows to others.
 *
 * One row per identity on the auth server. Supabase Auth links a Google
 * sign-in whose email matches an existing account automatically and has no
 * setting to turn that off, so the page shows every identity it finds. The
 * same provider may be linked several times (a work and a personal Google, or
 * old and new while re-pointing). Limiting it to one would force a Google-only
 * user to remove the old one first, which the "keep a web login" guard
 * refuses — a dead end. The same Google account on two of our accounts is
 * refused by the auth server itself (`identity_already_exists`).
 *
 * Passwords are never typed here. "Set / change password" mails the recovery
 * link, and the password is chosen on `/reset-password`. That gives a
 * Google-only user the same path as everyone else and keeps
 * `secure_password_change` satisfied without a re-authentication UI, because
 * the link issues a fresh session. Removal is allowed only while a web login
 * (a password or a Google identity) remains; `evaluateIdentityRemoval` in
 * `@blindfold-chess/features/account` makes that call for both the button and
 * the Server Action. Apple can only be added from the iOS app, so an Apple row
 * appears only once such an identity exists.
 *
 * Account deletion lives at the very bottom of this page, below a divider. It
 * used to sit under the profile form, but the profile is where a new member
 * is sent right after sign-up, and "Delete account" is the wrong thing to show
 * there. Deletion belongs with the account, and "account page, bottom" is
 * where other services keep it — out of the way, but findable.
 *
 * @flow
 * - Change email → two confirmation emails (old and new address) →
 *   `/auth/callback?type=email_change` → back here with `?notice=`
 * - Set / change password → recovery email → `/auth/callback?type=recovery` →
 *   `/reset-password`
 * - Add a Google account → Google → `/auth/callback?link=google` → back here
 *   with `?notice=`
 * - Remove → confirmation dialog → toast
 * - Delete account (bottom link) → `/mypage/delete-account`
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';
import { readAccountPageNotice } from '@/lib/users/account-page-notice';
import { getAccountLoginState } from '@/lib/users/login-methods';

import { Divider, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { TEXT_LINK_DESTRUCTIVE_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { EmailCard, LoginMethodsCard } from './_components';

type Props = LocaleSearchPageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.account',
    path: 'mypage/account',
    noIndex: true,
  });
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const user = await getAuthenticatedUser();
  const [t, state, query] = await Promise.all([
    getTranslations({ locale, namespace: 'MypageAccount' }),
    getAccountLoginState(user.id),
    searchParams,
  ]);
  const notice = readAccountPageNotice(query);

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      {notice !== undefined && (
        <p
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
        >
          {/* MypageAccount.notices.<AccountPageNotice>: MypageAccount.notices.linkedGoogle, MypageAccount.notices.linkDuplicate, MypageAccount.notices.linkFailed, MypageAccount.notices.emailChangePending, MypageAccount.notices.emailChangeDone, MypageAccount.notices.emailChangeLinkInvalid (ACCOUNT_PAGE_NOTICES) */}
          {t(`notices.${notice}`)}
        </p>
      )}

      <section className="space-y-4">
        <SectionTitle>{t('email.title')}</SectionTitle>
        <EmailCard email={state.email} pendingEmail={state.pendingEmail} />
      </section>

      <section className="space-y-4">
        <SectionTitle>{t('methods.title')}</SectionTitle>
        <LoginMethodsCard
          identities={state.identities}
          hasPassword={state.hasPassword}
          email={state.email}
        />
      </section>

      <Divider />

      {/* Deletion: separated from the body so someone who came to check their
          login details does not have it in their eye line. */}
      <Link
        href="/mypage/delete-account"
        locale={locale}
        className={`inline-block text-sm ${TEXT_LINK_DESTRUCTIVE_CLASSES}`}
      >
        {t('deleteAccountLink')}
      </Link>
    </PageLayout>
  );
}

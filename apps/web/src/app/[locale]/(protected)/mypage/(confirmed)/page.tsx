import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAuthenticatedUser } from '@/lib/auth';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

import { buildDashboardCards } from './_lib/buildDashboardCards';
import { getMypageDashboardData } from './_lib/getMypageDashboardData';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypage' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function MypagePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Mypage' });

  const user = await getAuthenticatedUser();
  const data = await getMypageDashboardData(user.id);
  const cards = buildDashboardCards(data, t);

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {data.username && (
          <div className="mb-4">
            <Link
              href={`/@/${data.username}`}
              locale={locale}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t('dashboard.viewProfile', { username: data.username })}
            </Link>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              locale={locale}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{card.icon}</span>
              <h2 className="mt-2 text-base font-semibold text-card-foreground">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.summary}</p>
            </Link>
          ))}
        </div>

        <Divider />

        <Breadcrumb locale={locale} items={[{ label: t('title') }]} />
      </PagePanel>
    </div>
  );
}

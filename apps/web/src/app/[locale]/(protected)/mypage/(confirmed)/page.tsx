import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Breadcrumb, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

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

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <nav>
          <ul>
            <li>
              <Link href={`/${locale}/mypage/practice`} className="text-primary hover:underline">
                {t('practiceLink')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/mypage/likes`} className="text-primary hover:underline">
                {t('likesLink')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/mypage/profile`} className="text-primary hover:underline">
                {t('profileLink')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/mypage/delete-account`}
                className="text-destructive hover:underline"
              >
                {t('deleteAccountLink')}
              </Link>
            </li>
          </ul>
        </nav>

        <Divider />

        <Breadcrumb locale={locale} items={[{ label: t('title') }]} />
      </PagePanel>
    </div>
  );
}

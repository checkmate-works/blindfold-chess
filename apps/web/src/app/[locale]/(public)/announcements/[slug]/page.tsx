import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
// Renamed to avoid conflict with Next.js route segment config `export const dynamic`
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncement } from '../_lib/queries';

export const dynamic = 'force-dynamic';

const MarkdownRenderer = nextDynamic(
  () =>
    import('@/app/[locale]/_components/MarkdownRenderer').then((m) => ({
      default: m.MarkdownRenderer,
    })),
  { ssr: true }
);

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const announcement = await getPublishedAnnouncement(slug, locale);

  if (!announcement) {
    const t = await getTranslations({ locale, namespace: 'announcements' });
    return {
      title: t('announcementNotFound'),
    };
  }

  const title = announcement.title;

  return {
    ...generateCanonicalMetadata({ locale, path: `announcements/${slug}`, title }),
    title,
  };
}

export default async function AnnouncementPage({ params }: Props) {
  const { locale, slug } = await params;
  const announcement = await getPublishedAnnouncement(slug, locale);
  const t = await getTranslations({ locale, namespace: 'announcements' });

  if (!announcement) {
    notFound();
  }

  if (announcement.visibility === 'members_only') {
    const user = await getOptionalUser();

    if (!user) {
      return (
        <div className="space-y-12">
          <header>
            <PageTitle>{announcement.title}</PageTitle>
          </header>

          <PagePanel>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t('membersOnly')}</p>
              <Link
                href="/sign-in"
                locale={locale}
                className="text-link-primary hover:underline font-medium"
              >
                {t('signInToView')}
              </Link>
            </div>

            <AdBannerGuard slot="banner-standard" />

            <Divider />

            <Breadcrumb
              items={[
                { label: t('pageTitle'), href: '/announcements' },
                { label: announcement.title },
              ]}
              locale={locale}
            />
          </PagePanel>
        </div>
      );
    }
  }

  const publishedDate = announcement.publishedAt
    ? new Date(announcement.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <div className="space-y-12">
      <header>
        <PageTitle>{announcement.title}</PageTitle>
      </header>

      <PagePanel>
        <article className="prose prose-slate dark:prose-invert max-w-none break-words">
          <MarkdownRenderer content={announcement.content} skipFirstH1={true} />
        </article>

        {publishedDate && (
          <p className="text-sm text-muted-foreground text-right">{publishedDate}</p>
        )}

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/announcements' }, { label: announcement.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}

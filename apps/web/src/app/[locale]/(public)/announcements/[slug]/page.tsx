import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { Link } from '@/i18n/routing';

import { getOptionalUser } from '@/lib/auth';

import {
  Breadcrumb,
  Divider,
  MarkdownRenderer,
  PagePanel,
  PageTitle,
} from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedAnnouncement, getPublishedAnnouncements } from '../_lib/queries';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const announcements = await getPublishedAnnouncements();
  const slugs = [...new Set(announcements.map((a) => a.slug))];

  return SUPPORTED_LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const announcement = await getPublishedAnnouncement(slug, locale);

  if (!announcement) {
    return {
      title: 'Announcement Not Found',
    };
  }

  return {
    ...generateCanonicalMetadata({ locale, path: `announcements/${slug}` }),
    title: announcement.title,
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

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/announcements' }, { label: announcement.title }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}

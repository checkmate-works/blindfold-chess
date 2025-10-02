import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getManualArticle, getAvailableManualArticles } from '../_lib/utils';
import {
  PageTitle,
  PageDescription,
  Breadcrumb,
  MarkdownRenderer,
  Divider,
} from '@/app/[locale]/_components';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = getAvailableManualArticles();
  const locales = ['en', 'ja'] as const;

  return slugs.flatMap((slug) =>
    locales.map((locale) => ({
      locale,
      slug,
    }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getManualArticle(slug, locale);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const title = article.metadata.title;
  const excerpt = article.metadata.excerpt;

  return {
    title,
    description: excerpt,
  };
}

export default async function ManualArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = await getManualArticle(slug, locale);
  const t = await getTranslations({ locale, namespace: 'manual' });

  if (!article) {
    notFound();
  }

  const title = article.metadata.title;
  const tags = article.metadata.tags;
  const excerpt = article.metadata.excerpt;

  return (
    <div className="space-y-8">
      <PageTitle>{title}</PageTitle>

      <PageDescription>{excerpt}</PageDescription>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <article className="prose prose-slate dark:prose-invert max-w-none space-y-4">
        <MarkdownRenderer content={article.content} skipFirstH1={true} />
      </article>

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/manual' }, { label: title }]}
        locale={locale}
      />
    </div>
  );
}

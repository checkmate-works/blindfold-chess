import { notFound } from 'next/navigation';
import { getManualArticle, getAvailableManualArticles } from '@/lib/manual';
import { PageTitle, Breadcrumb, MarkdownRenderer } from '@/app/[locale]/_components';
import { getTranslations } from 'next-intl/server';

interface ManualArticlePageProps {
  params: Promise<{
    locale: 'en' | 'ja';
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const articles = getAvailableManualArticles();
  const params = [];

  for (const slug of articles) {
    params.push({ locale: 'en', slug });
    params.push({ locale: 'ja', slug });
  }

  return params;
}

export async function generateMetadata({ params }: ManualArticlePageProps) {
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

export default async function ManualArticlePage({ params }: ManualArticlePageProps) {
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
    <>
      <div className="mb-8">
        <PageTitle>{title}</PageTitle>
        <p className="text-muted-foreground mb-4">{excerpt}</p>

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
      </div>

      <article className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
        <MarkdownRenderer content={article.content} skipFirstH1={true} />
      </article>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[{ label: t('title'), href: '/manual' }, { label: title }]}
          locale={locale}
        />
      </div>
    </>
  );
}

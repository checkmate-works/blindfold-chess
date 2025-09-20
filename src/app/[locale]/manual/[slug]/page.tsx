import { notFound } from 'next/navigation';
import { getManualArticle, getAvailableManualArticles } from '@/lib/manual';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import ReactMarkdown from 'react-markdown';
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
        <ReactMarkdown
          components={{
            h1: ({ children, node }) => {
              // Skip the first h1 in the markdown since we display the title separately
              const isFirstH1 = node?.position?.start?.line === 1;
              if (isFirstH1) {
                return null;
              }
              return (
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 mt-8">
                  {children}
                </h1>
              );
            },
            h2: ({ children }) => (
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 mt-8 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 mt-6">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-border pl-4 py-2 my-6 bg-muted/50 text-muted-foreground italic">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="text-primary bg-muted px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              }
              return <code className={className}>{children}</code>;
            },
            pre: ({ children }) => (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                className="text-primary underline decoration-1 underline-offset-2 hover:text-primary/80 transition-colors"
              >
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                className="rounded-lg shadow-lg mx-auto my-6 max-w-full sm:max-w-[80%] lg:max-w-[70%]"
              />
            ),
          }}
        >
          {article.content}
        </ReactMarkdown>
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

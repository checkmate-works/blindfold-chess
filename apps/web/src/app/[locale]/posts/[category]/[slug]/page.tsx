import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { JsonLd, generateBlogPostingSchema } from '@/lib/jsonld';

import { Breadcrumb, Divider, MarkdownRenderer, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPublishedPost } from '../../_lib/queries';

type Props = {
  params: Promise<{ locale: Locale; category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const post = await getPublishedPost(category, slug);

  if (!post) {
    return { title: 'Not Found' };
  }

  const t = await getTranslations({ locale, namespace: 'posts' });

  return {
    ...generateCanonicalMetadata({ locale, path: `posts/${category}/${slug}` }),
    title: `${post.title} - ${t('pageTitle')}`,
    description: post.content.slice(0, 160).replace(/[#*`]/g, ''),
  };
}

export default async function PostPage({ params }: Props) {
  const { locale, category, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'posts' });

  const post = await getPublishedPost(category, slug);

  if (!post) {
    notFound();
  }

  const categoryLabel = t(`categories.${category}`);
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const blogPostSchemaData = {
    title: post.title,
    description: post.content.slice(0, 160).replace(/[#*`]/g, ''),
    slug: post.slug,
    category,
    publishedAt: post.publishedAt,
    locale,
  };

  return (
    <div className="space-y-12">
      <JsonLd data={generateBlogPostingSchema(blogPostSchemaData)} />
      {/* Header */}
      <header className="space-y-4">
        <PageTitle>{post.title}</PageTitle>
      </header>

      {/* Content */}
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <MarkdownRenderer content={post.content} skipFirstH1={true} />
      </article>

      {/* Post metadata */}
      <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
          {categoryLabel}
        </span>
        {publishedDate && <time>{publishedDate}</time>}
      </div>

      <Divider />

      <Breadcrumb
        items={[
          { label: t('pageTitle'), href: '/posts' },
          { label: categoryLabel, href: `/posts/${category}` },
          { label: post.title },
        ]}
        locale={locale}
      />
    </div>
  );
}

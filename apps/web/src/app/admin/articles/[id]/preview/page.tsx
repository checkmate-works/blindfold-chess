import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { articles, db } from '@/lib/db';

import { MarkdownRenderer } from '@/app/[locale]/_components';

import { ArticlePreviewForm } from '../../_components/ArticlePreviewForm';
import { formatDateTimeLocal } from '../../_lib/format';

export default async function PreviewArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);

  if (!article) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t('form.previewTitle')}</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            {t('form.contentPreview')}
          </h2>
          <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
            <h2 className="text-xl font-bold mb-4">{article.title}</h2>
            <article className="prose prose-slate dark:prose-invert max-w-none break-words">
              <MarkdownRenderer content={article.content} skipFirstH1={true} />
            </article>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            {t('form.locale')}: <span className="text-foreground">{article.locale}</span>
          </p>
        </div>

        <ArticlePreviewForm
          id={article.id}
          articleData={{
            slug: article.slug,
            title: article.title,
            content: article.content,
            locale: article.locale,
          }}
          defaultValues={{
            status: article.status ?? 'draft',
            pinnedAt: formatDateTimeLocal(article.pinnedAt) ?? '',
            publishedAt: formatDateTimeLocal(article.publishedAt) ?? '',
          }}
          labels={{
            status: t('form.status'),
            pinnedAt: t('form.pinnedAt'),
            publishedAt: t('form.publishedAt'),
            save: t('form.save'),
            saving: t('form.saving'),
            backToEdit: t('form.backToEdit'),
            draft: t('draft'),
            published: t('published'),
          }}
        />
      </div>
    </div>
  );
}

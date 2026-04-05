'use client';

import { createArticle } from '../_actions/createArticle';
import type { ContentFormat } from '../_lib/types';
import { ArticleForm } from './ArticleForm';

type NewArticleFormProps = {
  categories: { id: string; name: string }[];
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
  defaultSlug?: string;
  defaultLocale?: string;
  contentFormat?: ContentFormat;
};

export function NewArticleForm({
  categories,
  labels,
  defaultSlug,
  defaultLocale,
  contentFormat,
}: NewArticleFormProps) {
  return (
    <ArticleForm
      categories={categories}
      contentFormat={contentFormat}
      defaultSlug={defaultSlug}
      defaultLocale={defaultLocale}
      onSaveDraft={(data) =>
        createArticle({
          ...data,
          status: 'draft',
          pinnedAt: null,
          publishedAt: null,
          excerpt: data.excerpt || null,
          description: data.description || null,
          categoryId: data.categoryId || null,
          icon: data.icon || null,
        })
      }
      labels={labels}
    />
  );
}

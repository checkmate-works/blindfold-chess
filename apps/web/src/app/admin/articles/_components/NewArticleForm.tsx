'use client';

import { createArticle } from '../_actions/createArticle';
import { ArticleForm } from './ArticleForm';

type NewArticleFormProps = {
  categories: { id: string; name: string }[];
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
};

export function NewArticleForm({ categories, labels }: NewArticleFormProps) {
  return (
    <ArticleForm
      categories={categories}
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

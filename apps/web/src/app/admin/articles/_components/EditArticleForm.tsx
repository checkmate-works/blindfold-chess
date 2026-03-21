'use client';

import type { ArticleImage } from '@/lib/db';

import { updateArticle } from '../_actions/updateArticle';
import { ArticleForm } from './ArticleForm';

type EditArticleFormProps = {
  id: string;
  defaultValues: {
    slug: string;
    title: string;
    content: string;
    locale: string;
    status: string;
    pinnedAt: string | null;
    publishedAt: string | null;
    excerpt: string;
    description: string;
    categoryId: string;
    icon: string;
  };
  categories: { id: string; name: string }[];
  images?: ArticleImage[];
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
};

export function EditArticleForm({
  id,
  defaultValues,
  categories,
  images,
  labels,
}: EditArticleFormProps) {
  return (
    <ArticleForm
      articleId={id}
      defaultValues={{
        slug: defaultValues.slug,
        title: defaultValues.title,
        content: defaultValues.content,
        locale: defaultValues.locale,
        excerpt: defaultValues.excerpt,
        description: defaultValues.description,
        categoryId: defaultValues.categoryId,
        icon: defaultValues.icon,
      }}
      categories={categories}
      initialImages={images}
      onSaveDraft={(data) =>
        updateArticle(id, {
          ...data,
          status: 'draft',
          pinnedAt: defaultValues.pinnedAt,
          publishedAt: defaultValues.publishedAt,
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

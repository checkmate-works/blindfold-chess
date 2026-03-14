'use client';

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
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
};

export function EditArticleForm({ id, defaultValues, categories, labels }: EditArticleFormProps) {
  return (
    <ArticleForm
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

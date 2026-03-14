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
  };
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
};

export function EditArticleForm({ id, defaultValues, labels }: EditArticleFormProps) {
  return (
    <ArticleForm
      defaultValues={{
        slug: defaultValues.slug,
        title: defaultValues.title,
        content: defaultValues.content,
        locale: defaultValues.locale,
      }}
      onSaveDraft={(data) =>
        updateArticle(id, {
          ...data,
          status: 'draft',
          pinnedAt: defaultValues.pinnedAt,
          publishedAt: defaultValues.publishedAt,
        })
      }
      labels={labels}
    />
  );
}

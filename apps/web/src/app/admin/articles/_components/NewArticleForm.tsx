'use client';

import { createArticle } from '../_actions/createArticle';
import { ArticleForm } from './ArticleForm';

type NewArticleFormProps = {
  labels: React.ComponentProps<typeof ArticleForm>['labels'];
};

export function NewArticleForm({ labels }: NewArticleFormProps) {
  return (
    <ArticleForm
      onSaveDraft={(data) =>
        createArticle({
          ...data,
          status: 'draft',
          pinnedAt: null,
          publishedAt: null,
        })
      }
      labels={labels}
    />
  );
}

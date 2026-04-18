'use client';

import { updateArticle } from '../_actions/updateArticle';
import type { ContentFormat, TiptapJsonContent } from '../_lib/types';
import { ArticleForm } from './ArticleForm';

type EditArticleFormProps = {
  id: string;
  defaultValues: {
    slug: string;
    title: string;
    content: string;
    contentJson: TiptapJsonContent | null;
    contentFormat: ContentFormat;
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
  // TODO: When `publishedAt` is a future timestamp the article is "scheduled",
  // not yet actually published. The future-timestamp check is not implemented
  // yet, so for now we treat the mere presence of `publishedAt` as "published".
  const isPublished = defaultValues.status === 'published' && defaultValues.publishedAt != null;

  return (
    <ArticleForm
      articleId={id}
      contentFormat={defaultValues.contentFormat}
      isPublished={isPublished}
      defaultValues={{
        slug: defaultValues.slug,
        title: defaultValues.title,
        content: defaultValues.content,
        contentJson: defaultValues.contentJson,
        contentFormat: defaultValues.contentFormat,
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
          status: isPublished ? 'published' : 'draft',
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

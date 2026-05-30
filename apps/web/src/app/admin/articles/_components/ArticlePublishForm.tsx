'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Field, Input } from '@/app/admin/_components/forms';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { updateArticle } from '../_actions/updateArticle';
import type { ContentFormat, TiptapJsonContent } from '../_lib/types';

type ArticlePublishFormProps = {
  id: string;
  slug: string;
  articleData: {
    slug: string;
    title: string;
    content: string;
    contentJson: TiptapJsonContent | null;
    contentFormat: ContentFormat;
    locale: string;
    excerpt: string | null;
    description: string | null;
    categoryId: string | null;
    icon: string | null;
  };
  defaultValues: {
    pinnedAt: string;
    publishedAt: string;
  };
  labels: {
    pinnedAt: string;
    publishedAt: string;
    publish: string;
    publishing: string;
    published: string;
    backToEdit: string;
  };
};

export function ArticlePublishForm({
  id,
  slug,
  articleData,
  defaultValues,
  labels,
}: ArticlePublishFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [pinnedAt, setPinnedAt] = useState(defaultValues.pinnedAt);
  const [publishedAt, setPublishedAt] = useState(defaultValues.publishedAt);

  const handlePublish = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateArticle(id, {
        ...articleData,
        status: 'published',
        pinnedAt: pinnedAt || null,
        publishedAt: publishedAt || null,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        showToast(labels.published, 'success');
        router.push(`/admin/articles/slug/${encodeURIComponent(slug)}`);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Field label={labels.publishedAt} htmlFor="publishedAt">
        <Input
          id="publishedAt"
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
        />
      </Field>

      <Field label={labels.pinnedAt} htmlFor="pinnedAt">
        <Input
          id="pinnedAt"
          type="datetime-local"
          value={pinnedAt}
          onChange={(e) => setPinnedAt(e.target.value)}
        />
      </Field>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <Button variant="primary" onClick={handlePublish} disabled={isPending}>
          {isPending ? labels.publishing : labels.publish}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/articles/${id}/edit`)}
          disabled={isPending}
        >
          {labels.backToEdit}
        </Button>
      </div>
    </div>
  );
}

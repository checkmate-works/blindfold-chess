'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { updateArticle } from '../_actions/updateArticle';
import type { ContentFormat, TiptapJsonContent } from '../_lib/types';

type ArticlePublishFormProps = {
  id: string;
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
    backToEdit: string;
  };
};

export function ArticlePublishForm({
  id,
  articleData,
  defaultValues,
  labels,
}: ArticlePublishFormProps) {
  const router = useRouter();
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
        router.push('/admin/articles');
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label htmlFor="publishedAt" className="block text-sm font-medium mb-1">
          {labels.publishedAt}
        </label>
        <input
          id="publishedAt"
          type="datetime-local"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
        />
      </div>

      <div>
        <label htmlFor="pinnedAt" className="block text-sm font-medium mb-1">
          {labels.pinnedAt}
        </label>
        <input
          id="pinnedAt"
          type="datetime-local"
          value={pinnedAt}
          onChange={(e) => setPinnedAt(e.target.value)}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? labels.publishing : labels.publish}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/articles/${id}/edit`)}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
        >
          {labels.backToEdit}
        </button>
      </div>
    </div>
  );
}

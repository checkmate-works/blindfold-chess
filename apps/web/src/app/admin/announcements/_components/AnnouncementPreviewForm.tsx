'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { formatDateTimeLocal } from '../../_lib/format';
import { updateAnnouncement } from '../_actions/updateAnnouncement';

type AnnouncementPreviewFormProps = {
  id: string;
  announcementData: {
    slug: string;
    title: string;
    content: string;
    locale: string;
  };
  defaultValues: {
    status: string;
    visibility: string;
    pinnedAt: string;
    publishedAt: string;
  };
  notificationSent: boolean;
  labels: {
    status: string;
    visibility: string;
    pinnedAt: string;
    publishedAt: string;
    save: string;
    saving: string;
    backToEdit: string;
    draft: string;
    published: string;
    public: string;
    members: string;
    sendNotification: string;
    notificationAlreadySent: string;
  };
};

export function AnnouncementPreviewForm({
  id,
  announcementData,
  defaultValues,
  notificationSent,
  labels,
}: AnnouncementPreviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState(defaultValues.status);
  const [visibility, setVisibility] = useState(defaultValues.visibility);
  const [pinnedAt, setPinnedAt] = useState(defaultValues.pinnedAt);
  const [publishedAt, setPublishedAt] = useState(defaultValues.publishedAt);
  const [sendNotification, setSendNotification] = useState(false);

  const isInitialPublish = defaultValues.status !== 'published' && status === 'published';
  const showNotificationCheckbox = isInitialPublish;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'published' && !publishedAt) {
      setPublishedAt(formatDateTimeLocal(new Date()) ?? '');
    }
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateAnnouncement(id, {
        ...announcementData,
        status,
        visibility,
        pinnedAt: pinnedAt || null,
        publishedAt: publishedAt || null,
        sendNotification: showNotificationCheckbox && !notificationSent && sendNotification,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        router.push('/admin/announcements');
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <fieldset>
        <legend className="text-sm font-medium mb-2">{labels.status}</legend>
        <div className="flex items-center gap-3">
          <label
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm cursor-pointer text-center transition-colors ${
              status === 'draft'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/50'
            }`}
          >
            <input
              type="radio"
              name="status"
              value="draft"
              checked={status === 'draft'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="sr-only"
            />
            {labels.draft}
          </label>
          <label
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm cursor-pointer text-center transition-colors ${
              status === 'published'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/50'
            }`}
          >
            <input
              type="radio"
              name="status"
              value="published"
              checked={status === 'published'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="sr-only"
            />
            {labels.published}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium mb-2">{labels.visibility}</legend>
        <div className="flex items-center gap-3">
          <label
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm cursor-pointer text-center transition-colors ${
              visibility === 'public'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/50'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={(e) => setVisibility(e.target.value)}
              className="sr-only"
            />
            {labels.public}
          </label>
          <label
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm cursor-pointer text-center transition-colors ${
              visibility === 'members_only'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/50'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="members_only"
              checked={visibility === 'members_only'}
              onChange={(e) => setVisibility(e.target.value)}
              className="sr-only"
            />
            {labels.members}
          </label>
        </div>
      </fieldset>

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

      {status === 'published' && (
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
      )}

      {showNotificationCheckbox && (
        <div className="flex items-center gap-2">
          {notificationSent ? (
            <p className="text-sm text-muted-foreground">{labels.notificationAlreadySent}</p>
          ) : (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="rounded border-border"
              />
              {labels.sendNotification}
            </label>
          )}
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/announcements/${id}/edit`)}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
        >
          {labels.backToEdit}
        </button>
      </div>
    </div>
  );
}

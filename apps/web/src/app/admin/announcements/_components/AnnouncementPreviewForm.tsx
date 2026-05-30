'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Field, Input } from '@/app/admin/_components/forms';

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
    showAsBanner: boolean;
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
    showAsBanner: string;
    showAsBannerHint: string;
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
  const [showAsBanner, setShowAsBanner] = useState(defaultValues.showAsBanner);
  const [pinnedAt, setPinnedAt] = useState(defaultValues.pinnedAt);
  const [publishedAt, setPublishedAt] = useState(defaultValues.publishedAt);
  const [sendNotification, setSendNotification] = useState(false);

  const isInitialPublish = defaultValues.status !== 'published' && status === 'published';
  const showNotificationCheckbox = isInitialPublish;
  // The banner only ever renders for published + public announcements, so only
  // surface the opt-in where it can actually take effect.
  const showBannerToggle = status === 'published' && visibility === 'public';

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
        // Only public published announcements can ever show a banner; force the
        // flag off otherwise so a stale opt-in can't linger on a draft/members
        // announcement that later flips back to public+published.
        showAsBanner: showBannerToggle ? showAsBanner : false,
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
    <div className="space-y-4">
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

      <Field label={labels.pinnedAt} htmlFor="pinnedAt">
        <Input
          id="pinnedAt"
          type="datetime-local"
          value={pinnedAt}
          onChange={(e) => setPinnedAt(e.target.value)}
        />
      </Field>

      {status === 'published' && (
        <Field label={labels.publishedAt} htmlFor="publishedAt">
          <Input
            id="publishedAt"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </Field>
      )}

      {showBannerToggle && (
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showAsBanner}
              onChange={(e) => setShowAsBanner(e.target.checked)}
              className="rounded border-border"
            />
            {labels.showAsBanner}
          </label>
          <p className="mt-1 text-xs text-muted-foreground">{labels.showAsBannerHint}</p>
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
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? labels.saving : labels.save}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/announcements/${id}/edit`)}
          disabled={isPending}
        >
          {labels.backToEdit}
        </Button>
      </div>
    </div>
  );
}

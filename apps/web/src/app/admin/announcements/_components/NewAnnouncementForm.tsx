'use client';

import { createAnnouncement } from '../_actions/createAnnouncement';
import { AnnouncementForm } from './AnnouncementForm';

type NewAnnouncementFormProps = {
  labels: React.ComponentProps<typeof AnnouncementForm>['labels'];
  defaultSlug?: string;
  defaultLocale?: string;
};

export function NewAnnouncementForm({
  labels,
  defaultSlug,
  defaultLocale,
}: NewAnnouncementFormProps) {
  const defaultValues =
    defaultSlug != null || defaultLocale != null
      ? {
          slug: defaultSlug ?? '',
          title: '',
          content: '',
          locale: defaultLocale ?? 'en',
        }
      : undefined;

  return (
    <AnnouncementForm
      defaultValues={defaultValues}
      onSaveDraft={(data) =>
        createAnnouncement({
          ...data,
          status: 'draft',
          visibility: 'public',
          pinnedAt: null,
          publishedAt: null,
        })
      }
      labels={labels}
    />
  );
}

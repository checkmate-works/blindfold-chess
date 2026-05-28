'use client';

import { updateAnnouncement } from '../_actions/updateAnnouncement';
import { AnnouncementForm } from './AnnouncementForm';

type EditAnnouncementFormProps = {
  id: string;
  defaultValues: {
    slug: string;
    title: string;
    content: string;
    locale: string;
    status: string;
    visibility: string;
    showAsBanner: boolean;
    pinnedAt: string | null;
    publishedAt: string | null;
  };
  labels: React.ComponentProps<typeof AnnouncementForm>['labels'];
};

export function EditAnnouncementForm({ id, defaultValues, labels }: EditAnnouncementFormProps) {
  const isPublished = defaultValues.status === 'published' && defaultValues.publishedAt != null;

  return (
    <AnnouncementForm
      isPublished={isPublished}
      defaultValues={{
        slug: defaultValues.slug,
        title: defaultValues.title,
        content: defaultValues.content,
        locale: defaultValues.locale,
      }}
      onSaveDraft={(data) =>
        updateAnnouncement(id, {
          ...data,
          status: isPublished ? 'published' : 'draft',
          visibility: defaultValues.visibility,
          showAsBanner: defaultValues.showAsBanner,
          pinnedAt: defaultValues.pinnedAt,
          publishedAt: defaultValues.publishedAt,
        })
      }
      labels={labels}
    />
  );
}

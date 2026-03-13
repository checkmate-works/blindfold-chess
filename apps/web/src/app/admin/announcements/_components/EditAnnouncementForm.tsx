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
    pinnedAt: string | null;
    publishedAt: string | null;
  };
  labels: React.ComponentProps<typeof AnnouncementForm>['labels'];
};

export function EditAnnouncementForm({ id, defaultValues, labels }: EditAnnouncementFormProps) {
  return (
    <AnnouncementForm
      defaultValues={defaultValues}
      onSubmit={(data) => updateAnnouncement(id, data)}
      labels={labels}
    />
  );
}

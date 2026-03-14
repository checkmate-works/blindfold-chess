'use client';

import { createAnnouncement } from '../_actions/createAnnouncement';
import { AnnouncementForm } from './AnnouncementForm';

type NewAnnouncementFormProps = {
  labels: React.ComponentProps<typeof AnnouncementForm>['labels'];
};

export function NewAnnouncementForm({ labels }: NewAnnouncementFormProps) {
  return (
    <AnnouncementForm
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

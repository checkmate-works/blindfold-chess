'use client';

import { AdminDeleteButton } from '../../_components/AdminDeleteButton';
import { deleteAnnouncement } from '../_actions/deleteAnnouncement';

type DeleteAnnouncementButtonProps = {
  id: string;
  title: string;
  labels: {
    deleteButton: string;
    modalTitle: string;
    modalMessage: string;
    cancel: string;
    confirm: string;
    deleting: string;
  };
};

export function DeleteAnnouncementButton({ id, title, labels }: DeleteAnnouncementButtonProps) {
  return (
    <AdminDeleteButton id={id} title={title} deleteAction={deleteAnnouncement} labels={labels} />
  );
}

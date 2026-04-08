'use client';

import { type ComponentProps } from 'react';

import { AdminDeleteButton } from '../../_components/AdminDeleteButton';
import { deleteAnnouncement } from '../_actions/deleteAnnouncement';

type Props = Omit<ComponentProps<typeof AdminDeleteButton>, 'deleteAction'>;

export function DeleteAnnouncementButton(props: Props) {
  return <AdminDeleteButton {...props} deleteAction={deleteAnnouncement} />;
}

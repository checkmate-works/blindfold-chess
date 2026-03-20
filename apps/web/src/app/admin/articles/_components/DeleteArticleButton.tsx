'use client';

import { AdminDeleteButton } from '../../_components/AdminDeleteButton';
import { deleteArticle } from '../_actions/deleteArticle';

type DeleteArticleButtonProps = {
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

export function DeleteArticleButton({ id, title, labels }: DeleteArticleButtonProps) {
  return <AdminDeleteButton id={id} title={title} deleteAction={deleteArticle} labels={labels} />;
}

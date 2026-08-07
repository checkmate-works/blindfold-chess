import { type ComponentProps } from 'react';

import { AdminDeleteButton } from '../../_components/AdminDeleteButton';
import { deleteArticle } from '../_actions/deleteArticle';

type Props = Omit<ComponentProps<typeof AdminDeleteButton>, 'deleteAction'>;

export function DeleteArticleButton(props: Props) {
  return <AdminDeleteButton {...props} deleteAction={deleteArticle} />;
}

'use server';

import { articles } from '@/lib/db';

import { createAdminDeleteAction } from '../../_lib/action-factories';

const deleteBase = createAdminDeleteAction({
  table: articles,
  revalidationPath: '/admin/articles',
});

export async function deleteArticle(id: string) {
  return deleteBase(id);
}

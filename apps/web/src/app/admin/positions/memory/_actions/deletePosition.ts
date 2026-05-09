'use server';

import type { DeleteResult } from '@/app/admin/_lib/action-factories';

import { softDeletePosition } from '../../_lib/soft-delete-position';

export async function deletePosition(id: string): Promise<DeleteResult> {
  return softDeletePosition(id, {
    revalidatePaths: ['/admin/positions/memory', `/admin/positions/memory/${id}`],
    excludeAlreadyDeleted: true,
  });
}

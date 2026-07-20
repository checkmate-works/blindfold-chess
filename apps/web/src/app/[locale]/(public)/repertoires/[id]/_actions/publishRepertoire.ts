'use server';

import { revalidatePath } from 'next/cache';

import type { PublishRepertoireResult } from '@/lib/repertoires/mutations';
import { publishRepertoireEntry } from '@/lib/repertoires/mutations';

/**
 * Owner-only: publish a `building` repertoire (→ `public`, one-way). Both the
 * detail page (status badge) and the /repertoires catalog (the course now
 * appears there, and disappears from the owner's "in progress" section) need
 * revalidating.
 */
export async function publishRepertoire(input: {
  id: string;
  locale: string;
}): Promise<PublishRepertoireResult> {
  const result = await publishRepertoireEntry(input.id);
  if ('success' in result) {
    revalidatePath(`/${input.locale}/repertoires/${input.id}`);
    revalidatePath(`/${input.locale}/repertoires`);
  }
  return result;
}

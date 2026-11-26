'use server';

import {
  POSITION_MEMORY_TOPIC,
  getPositionMemoryPostParams,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createPositionMemoryPostWithFenAttachment(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithFenAttachmentBase({
    ...(await getPositionMemoryPostParams(locale, positionId, formData)),
    redirectPath: parentPagePostRedirect(locale, POSITION_MEMORY_TOPIC.urlSegment, positionId),
  });
}

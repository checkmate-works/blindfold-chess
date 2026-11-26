'use server';

import {
  PUZZLE_TOPIC,
  getPositionPuzzlePostParams,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createPositionPuzzlePostWithAttachment(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithAttachmentBase({
    ...(await getPositionPuzzlePostParams(locale, positionId, formData)),
    redirectPath: parentPagePostRedirect(locale, PUZZLE_TOPIC.urlSegment, positionId),
  });
}

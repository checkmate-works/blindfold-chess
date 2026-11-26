'use server';

import {
  REPERTOIRE_TOPIC,
  getRepertoirePostParams,
} from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createRepertoirePostWithFenAttachment(
  locale: string,
  repertoireId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithFenAttachmentBase({
    ...(await getRepertoirePostParams(locale, repertoireId, formData)),
    redirectPath: parentPagePostRedirect(locale, REPERTOIRE_TOPIC.urlSegment, repertoireId),
  });
}

'use server';

import {
  REPERTOIRE_TOPIC,
  getRepertoirePostParams,
} from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createRepertoirePostWithAttachment(
  locale: string,
  repertoireId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithAttachmentBase({
    ...(await getRepertoirePostParams(locale, repertoireId, formData)),
    redirectPath: parentPagePostRedirect(locale, REPERTOIRE_TOPIC.urlSegment, repertoireId),
  });
}

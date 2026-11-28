import { NextResponse } from 'next/server';

import { guardApiMutation } from '@/lib/api-mutation-guard';
import { parseImageUpload } from '@/lib/images/parse-upload';
import { ALLOWED_IMAGE_MIME_TYPES, AVATAR_MAX_FILE_SIZE } from '@/lib/images/policy';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { clearAvatar, replaceAvatar } from '@/lib/users/avatar-update';

/**
 * Replaces the viewer's avatar. The processing, storage and cache-busting
 * live in `replaceAvatar`, shared with the app's `/api/mobile/v1/avatar`.
 */
export async function POST(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.uploadAvatar);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  // Parse + allow-list + size cap + magic-byte check, in that order. Shared
  // with the admin image endpoints so the avatar path cannot quietly lose a
  // step; only the allow-list and cap are ours.
  const upload = await parseImageUpload(request, {
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    maxFileSize: AVATAR_MAX_FILE_SIZE,
  });
  if (upload.error) {
    return upload.error;
  }

  const result = await replaceAvatar(user.id, upload.buffer);
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === 'upload_failed' ? 500 : 400 }
    );
  }
  return NextResponse.json({ avatarUrl: result.avatarUrl });
}

/**
 * Clears the viewer's avatar (`clearAvatar`). Succeeds when there is no
 * avatar to remove.
 */
export async function DELETE(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.deleteAvatar);
  if ('response' in guardResult) {
    return guardResult.response;
  }

  await clearAvatar(guardResult.user.id);

  return NextResponse.json({ success: true });
}

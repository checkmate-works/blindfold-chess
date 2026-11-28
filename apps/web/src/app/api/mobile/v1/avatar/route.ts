import { parseImageUpload } from '@/lib/images/parse-upload';
import { ALLOWED_IMAGE_MIME_TYPES, AVATAR_MAX_FILE_SIZE } from '@/lib/images/policy';
import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { clearAvatar, replaceAvatar } from '@/lib/users/avatar-update';

/**
 * Replaces the signed-in user's avatar — the app's counterpart of the web's
 * `POST /api/profile/avatar`: a multipart `file` field through the same
 * upload gate (`parseImageUpload`, the web's allow-list and 2 MB cap), the
 * same processing (`replaceAvatar`) and the same per-user rate limit. Error
 * codes are the web route's (`file_required`, `invalid_file_type`,
 * `file_too_large`, `upload_failed`); the body is `{ avatarUrl }`.
 */
export async function POST(request: Request) {
  return withMobileErrors('avatar', async () => {
    const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.uploadAvatar });
    if (!auth.ok) return auth.response;

    const upload = await parseImageUpload(request, {
      allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
      maxFileSize: AVATAR_MAX_FILE_SIZE,
    });
    if (upload.error) {
      // The gate answers with the web's plain JSON; re-emit it with the
      // mobile API's headers (no-store, CORS for the Expo web preview).
      const body = (await upload.error.json()) as { error: string };
      return mobileError(body.error, upload.error.status);
    }

    const result = await replaceAvatar(auth.user.id, upload.buffer);
    if ('error' in result) {
      return mobileError(result.error, result.error === 'upload_failed' ? 500 : 400);
    }
    return mobileJson({ avatarUrl: result.avatarUrl });
  });
}

/** Clears the signed-in user's avatar (`clearAvatar`); succeeds when there is none. */
export async function DELETE(request: Request) {
  return withMobileErrors('avatar', async () => {
    const auth = await authorizeMobileRequest(request, { rateLimit: RATE_LIMITS.deleteAvatar });
    if (!auth.ok) return auth.response;
    await clearAvatar(auth.user.id);
    return mobileJson({ success: true });
  });
}

export const OPTIONS = mobilePreflight;

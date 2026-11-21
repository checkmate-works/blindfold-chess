import { authorizeMobileRequest } from '@/lib/mobile-api/auth';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';
import { isUserBanned } from '@/lib/moderation/ban';
import { getViewerProfile } from '@/lib/users/viewer-profile';

export const dynamic = 'force-dynamic';

/**
 * The signed-in account as the app needs it: whether a username is set
 * (recording challenges does not need one; appearing on the web's
 * leaderboard does) and whether the account is banned. Answers for a banned
 * account too, so the app can say why recording is refused.
 */
export async function GET(request: Request) {
  return withMobileErrors('me', async () => {
    const auth = await authorizeMobileRequest(request, { allowBanned: true });
    if (!auth.ok) return auth.response;
    const [profile, banned] = await Promise.all([
      getViewerProfile(auth.user.id),
      isUserBanned(auth.user.id),
    ]);
    return mobileJson({
      userId: auth.user.id,
      email: auth.user.email ?? null,
      username: profile?.username ?? null,
      banned,
    });
  });
}

export const OPTIONS = mobilePreflight;

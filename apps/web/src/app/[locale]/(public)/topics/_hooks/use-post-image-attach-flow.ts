'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { ImageAttachResult } from '../_lib/image-attach-types';
import { uploadPostImages } from '../_lib/upload-post-images';

type ImageCreateAction = (formData: FormData) => Promise<ImageAttachResult>;

/**
 * The 2-step image attach flow for post forms: create the post via the
 * Server Action (which returns the post id instead of redirecting), upload
 * each file to `/api/posts/[id]/images`, then navigate client-side.
 *
 * This is a fundamentally different lifecycle from the PGN / FEN paths
 * (which redirect server-side): navigation must be DEFERRED. The flow first
 * clears the form's dirty flag so the unsaved-changes guard
 * (next-navigation-guard) is disabled, and that only takes effect on the
 * next render — so the intended navigation is stashed in state and a
 * post-render effect performs it once the guard is off. Navigating inline
 * would race the guard, which still reads `enabled: true` until the next
 * render, and pop the "Unsaved Changes" dialog on a successful submit.
 */
export function usePostImageAttachFlow({
  isDirty,
  clearDirty,
  imageRedirectPath,
}: {
  isDirty: boolean;
  /** Disarm the unsaved-changes guard before the deferred navigation. */
  clearDirty: () => void;
  /**
   * Destination after a successful attach. New-post pages navigate to the
   * created post's detail page; when omitted (inline reply forms), the
   * current page is revalidated and refreshed in place.
   */
  imageRedirectPath?: (postId: string) => string;
}) {
  const router = useRouter();

  const [pendingNav, setPendingNav] = useState<
    { kind: 'push'; path: string } | { kind: 'refresh' } | null
  >(null);

  // Run the deferred navigation once the dirty flag has cleared (which
  // disables the unsaved-changes guard). Guard on `!isDirty` so the
  // navigation never fires while the guard is still armed.
  useEffect(() => {
    if (!pendingNav || isDirty) return;
    if (pendingNav.kind === 'push') router.push(pendingNav.path);
    else router.refresh();
    setPendingNav(null);
  }, [pendingNav, isDirty, router]);

  const runImageAttach = useCallback(
    async (
      createAction: ImageCreateAction,
      formData: FormData,
      files: readonly File[]
    ): Promise<{ error?: string }> => {
      const created = await createAction(formData);
      if (!created.ok) return { error: created.error };
      const upload = await uploadPostImages(created.postId, files);
      if (!upload.ok) return { error: upload.error };
      // Clear dirty FIRST, then hand the navigation to the deferred-nav
      // effect above (see the hook TSDoc for why).
      clearDirty();
      if (imageRedirectPath) {
        setPendingNav({ kind: 'push', path: imageRedirectPath(created.postId) });
      } else {
        // Inline forms stay put; the refresh re-fetches the (dynamic) page
        // so the freshly uploaded image appears.
        setPendingNav({ kind: 'refresh' });
      }
      return {};
    },
    [clearDirty, imageRedirectPath]
  );

  return { runImageAttach };
}

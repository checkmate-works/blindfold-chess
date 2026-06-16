/**
 * Result of an image-attachment create/reply Server Action.
 *
 * The image attachment flow is 2-step (SPEC2 D1 case B): the Server
 * Action creates the post/reply WITHOUT redirecting and returns the new
 * post id so the client can drive the per-file upload to
 * `/api/posts/[id]/images`. This shared discriminated union lets the
 * client narrow without runtime guards.
 *
 * Defined in a plain (non-`"use server"`) module so the `"use server"`
 * action wrappers can `import type` it for their signatures without
 * tripping the Next.js "only async functions may be exported" rule.
 */
export type ImageAttachResult = { ok: true; postId: string } | { ok: false; error: string };

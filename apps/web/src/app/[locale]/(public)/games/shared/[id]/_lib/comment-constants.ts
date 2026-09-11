/**
 * Shared-game comments use the same body limit as topic posts, so this is
 * that one constant under the name the comment form and action already use
 * rather than a second `2000` that could drift from it. It lives here rather
 * than in the `'use server'` action file because that file may only export
 * async functions (a re-export there is a build error), and outside the client
 * component so the limit is imported by both the action (server validation)
 * and the form (client maxLength).
 */
export { MAX_CONTENT_LENGTH as MAX_GAME_COMMENT_LENGTH } from '@/lib/validations/content';

/**
 * Shared constants for shared-game comments. Kept out of the `'use server'`
 * action file because that file may only export async functions (a `const`
 * export there is a build error), and out of the client component so the limit
 * is defined once and imported by both the action (server validation) and the
 * form (client maxLength).
 */
export const MAX_GAME_COMMENT_LENGTH = 2000;

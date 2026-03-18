export const VALID_REPLY_PERMISSIONS = ['everyone', 'followers', 'nobody'] as const;

export type ReplyPermission = (typeof VALID_REPLY_PERMISSIONS)[number];

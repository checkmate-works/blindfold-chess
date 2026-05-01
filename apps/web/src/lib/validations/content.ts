export const MAX_CONTENT_LENGTH = 2000;

/**
 * Validate post/reply content from FormData.
 * Returns the trimmed content string on success, or an error key on failure.
 */
export function validateContent(formData: FormData): { error: string } | { content: string } {
  const content = formData.get('content');

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'contentRequired' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
  }

  return { content: content.trim() };
}

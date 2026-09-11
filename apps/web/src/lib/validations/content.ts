export const MAX_CONTENT_LENGTH = 2000;

export type ContentValidationError = 'contentRequired' | 'contentTooLong';

export type ContentValidationResult = { error: ContentValidationError } | { content: string };

/**
 * The single "body is required, at most `MAX_CONTENT_LENGTH` characters"
 * rule for every user-authored body: topic posts and replies, opening posts,
 * and comments on shared games.
 *
 * The length is measured on the trimmed value, because the trimmed value is
 * what every caller stores. Measuring the raw input instead rejects a body
 * that would have fit — `"a".repeat(1998) + "     "` is 2003 characters as
 * typed and 1998 once trimmed — and did so on some surfaces but not others
 * while each of them carried its own copy of this check.
 */
export function validateContentValue(value: unknown): ContentValidationResult {
  const trimmed = typeof value === 'string' ? value.trim() : '';

  if (trimmed.length === 0) {
    return { error: 'contentRequired' };
  }

  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return { error: 'contentTooLong' };
  }

  return { content: trimmed };
}

/**
 * Validate post/reply content from FormData.
 * Returns the trimmed content string on success, or an error key on failure.
 */
export function validateContent(formData: FormData): ContentValidationResult {
  return validateContentValue(formData.get('content'));
}

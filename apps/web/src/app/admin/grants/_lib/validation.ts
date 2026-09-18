/** Longest duration an admin grant may be given: ten years, expressed in days. */
export const MAX_GRANT_DURATION_DAYS = 3650;

export function validateDurationDays(
  durationDays: number
): 'invalidDuration' | 'durationTooLong' | null {
  if (!durationDays || durationDays <= 0) {
    return 'invalidDuration';
  }
  if (durationDays > MAX_GRANT_DURATION_DAYS) {
    return 'durationTooLong';
  }
  return null;
}

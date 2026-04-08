const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_DURATION_DAYS = 3650;

export function validateUuid(id: string): string | null {
  if (!UUID_REGEX.test(id)) {
    return `Invalid User ID format: ${id}`;
  }
  return null;
}

export function validateDurationDays(durationDays: number): string | null {
  if (!durationDays || durationDays <= 0) {
    return 'Duration must be a positive number';
  }
  if (durationDays > MAX_DURATION_DAYS) {
    return `Duration must not exceed ${MAX_DURATION_DAYS} days (10 years)`;
  }
  return null;
}

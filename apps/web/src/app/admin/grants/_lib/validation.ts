import { validateUserId } from '@/app/admin/_lib/validators';

const MAX_DURATION_DAYS = 3650;

export function validateUuid(id: string): string | null {
  return validateUserId(id);
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

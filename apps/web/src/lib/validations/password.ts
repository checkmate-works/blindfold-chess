import { MIN_PASSWORD_LENGTH } from '@/config';
import { z } from 'zod';

// Keep in sync with Supabase password_requirements in supabase/config.toml
// Production: also update in Supabase Dashboard > Authentication > Settings > Password
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'tooShort')
  .regex(/[a-zA-Z]/, 'missingLetter') // letters_digits: requires at least one letter
  .regex(/\d/, 'missingDigit'); // letters_digits: requires at least one digit

export type Password = z.infer<typeof passwordSchema>;

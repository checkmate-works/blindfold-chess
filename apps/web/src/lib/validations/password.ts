import { MIN_PASSWORD_LENGTH } from '@/config';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, 'tooShort')
  .regex(/[a-zA-Z]/, 'missingLetter')
  .regex(/\d/, 'missingDigit');

export type Password = z.infer<typeof passwordSchema>;

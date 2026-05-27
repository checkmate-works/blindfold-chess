import { z } from 'zod';

// Disallow CR/LF in single-line fields as defence-in-depth against
// email-header injection through the Resend subject line.
const NO_NEWLINES = /^[^\r\n]*$/;

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'nameRequired')
    .max(100, 'nameMaxLength')
    .regex(NO_NEWLINES, 'nameInvalid'),
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  subject: z
    .string()
    .min(1, 'subjectRequired')
    .max(200, 'subjectMaxLength')
    .regex(NO_NEWLINES, 'subjectInvalid'),
  message: z.string().min(10, 'messageMinLength').max(5000, 'messageMaxLength'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

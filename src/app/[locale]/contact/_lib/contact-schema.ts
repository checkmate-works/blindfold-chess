import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'nameRequired'),
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
  subject: z.string().min(1, 'subjectRequired'),
  message: z.string().min(10, 'messageMinLength'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

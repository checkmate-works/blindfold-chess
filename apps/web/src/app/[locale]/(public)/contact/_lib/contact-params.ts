import type { ContactFormData } from './contact-schema';

/**
 * Serialize contact form fields into a query string for the form <-> confirm
 * round-trip (ContactForm hands off to /contact/confirm; ContactConfirm links
 * back to /contact with the same values pre-filled). Both sides emit the same
 * name/email/subject/message params, so they share this builder.
 */
export function buildContactParams(data: ContactFormData): string {
  const params = new URLSearchParams();
  params.set('name', data.name);
  params.set('email', data.email);
  params.set('subject', data.subject);
  params.set('message', data.message);
  return params.toString();
}

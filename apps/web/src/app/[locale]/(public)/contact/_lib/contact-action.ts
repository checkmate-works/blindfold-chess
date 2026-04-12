'use server';

import { headers } from 'next/headers';

import { escapeHtml } from '@blindfold-chess/features/utils';
import { Resend } from 'resend';

import { handleServerActionError } from '@/lib/server-action-error';

import type { ContactFormData } from './contact-schema';
import { contactFormSchema } from './contact-schema';
import { checkRateLimit } from './rate-limiter';

const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactFormState = {
  success: boolean;
  error?: string;
};

export async function submitContactForm(data: ContactFormData): Promise<ContactFormState> {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
      };
    }

    // Validate form data
    const validatedData = contactFormSchema.parse(data);

    // Send email using Resend
    const result = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev',
      to: process.env.CONTACT_TO_EMAIL || 'delivered@resend.dev',
      subject: `[Blindfold Chess Contact] ${validatedData.subject}`,
      replyTo: validatedData.email,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(validatedData.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(validatedData.email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(validatedData.subject)}</p>
        <h3>Message:</h3>
        <p>${escapeHtml(validatedData.message).replace(/\n/g, '<br>')}</p>
      `,
    });

    if (result.error) {
      return handleServerActionError(
        new Error(result.error.message || 'Failed to send email'),
        '[submitContactForm] Resend API'
      );
    }

    return { success: true };
  } catch (error) {
    return handleServerActionError(error, '[submitContactForm]');
  }
}

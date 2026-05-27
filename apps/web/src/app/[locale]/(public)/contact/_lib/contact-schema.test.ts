import { describe, expect, it } from 'vitest';

import { contactFormSchema } from './contact-schema';

const base = {
  name: 'Alice',
  email: 'alice@example.com',
  subject: 'Hello',
  message: 'This is a message that is at least ten chars long.',
};

describe('contactFormSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(contactFormSchema.safeParse(base).success).toBe(true);
  });

  describe('name', () => {
    it('accepts exactly 100 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, name: 'a'.repeat(100) });
      expect(result.success).toBe(true);
    });

    it('rejects 101 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('nameMaxLength');
      }
    });

    it('rejects newlines', () => {
      const result = contactFormSchema.safeParse({ ...base, name: 'Ali\nce' });
      expect(result.success).toBe(false);
    });
  });

  describe('subject', () => {
    it('accepts exactly 200 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, subject: 's'.repeat(200) });
      expect(result.success).toBe(true);
    });

    it('rejects 201 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, subject: 's'.repeat(201) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('subjectMaxLength');
      }
    });

    it('rejects LF newlines (email-header injection defence)', () => {
      const result = contactFormSchema.safeParse({
        ...base,
        subject: 'Hello\nBcc: attacker@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects CR newlines (email-header injection defence)', () => {
      const result = contactFormSchema.safeParse({
        ...base,
        subject: 'Hello\rBcc: attacker@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('message', () => {
    it('accepts exactly 5000 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, message: 'm'.repeat(5000) });
      expect(result.success).toBe(true);
    });

    it('rejects 5001 characters', () => {
      const result = contactFormSchema.safeParse({ ...base, message: 'm'.repeat(5001) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('messageMaxLength');
      }
    });

    it('allows newlines inside the message body', () => {
      const result = contactFormSchema.safeParse({
        ...base,
        message: 'line one\nline two — this body has at least ten characters',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('email', () => {
    it('rejects malformed emails', () => {
      const result = contactFormSchema.safeParse({ ...base, email: 'not-an-email' });
      expect(result.success).toBe(false);
    });
  });
});

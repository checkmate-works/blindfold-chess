import { describe, expect, it } from 'vitest';

import { passwordSchema } from './password';

describe('passwordSchema', () => {
  describe('valid passwords', () => {
    it('should accept a password with letters and digits (8 chars)', () => {
      expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
    });

    it('should accept a password with letters and digits (longer than 8 chars)', () => {
      expect(passwordSchema.safeParse('securePassword123').success).toBe(true);
    });

    it('should accept a password with uppercase letters and digits', () => {
      expect(passwordSchema.safeParse('ABCDEFG1').success).toBe(true);
    });

    it('should accept a password with mixed case letters and digits', () => {
      expect(passwordSchema.safeParse('AbCdEfG1').success).toBe(true);
    });

    it('should accept a password with special characters, letters, and digits', () => {
      expect(passwordSchema.safeParse('p@ssw0rd!').success).toBe(true);
    });
  });

  describe('tooShort', () => {
    it('should reject an empty string', () => {
      const result = passwordSchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('tooShort');
      }
    });

    it('should reject a password with 7 characters', () => {
      const result = passwordSchema.safeParse('abcdef1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('tooShort');
      }
    });

    it('should accept a password with exactly 8 characters', () => {
      expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
    });
  });

  describe('missingLetter', () => {
    it('should reject a password with only digits', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingLetter');
      }
    });

    it('should reject a password with digits and special characters but no letters', () => {
      const result = passwordSchema.safeParse('1234!@#$');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingLetter');
      }
    });
  });

  describe('missingDigit', () => {
    it('should reject a password with only letters', () => {
      const result = passwordSchema.safeParse('abcdefgh');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingDigit');
      }
    });

    it('should reject a password with letters and special characters but no digits', () => {
      const result = passwordSchema.safeParse('abcdef!@');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingDigit');
      }
    });
  });

  describe('multiple validation errors', () => {
    it('should report tooShort as the first error for a short digits-only string', () => {
      const result = passwordSchema.safeParse('123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('tooShort');
      }
    });

    it('should report all applicable errors', () => {
      const result = passwordSchema.safeParse('!!!');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('tooShort');
        expect(messages).toContain('missingLetter');
        expect(messages).toContain('missingDigit');
      }
    });
  });
});

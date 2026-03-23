import { describe, expect, it } from 'vitest';

import {
  getPasswordValidationError,
  isPasswordValidationErrorKey,
  passwordSchema,
} from './password';

describe('passwordSchema', () => {
  describe('valid passwords', () => {
    it('should accept a password with letters and digits (6 chars)', () => {
      expect(passwordSchema.safeParse('abcde1').success).toBe(true);
    });

    it('should accept a password with letters and digits (longer than 6 chars)', () => {
      expect(passwordSchema.safeParse('securePassword123').success).toBe(true);
    });

    it('should accept a password with uppercase letters and digits', () => {
      expect(passwordSchema.safeParse('ABCDE1').success).toBe(true);
    });

    it('should accept a password with mixed case letters and digits', () => {
      expect(passwordSchema.safeParse('AbCdE1').success).toBe(true);
    });

    it('should accept a password with special characters, letters, and digits', () => {
      expect(passwordSchema.safeParse('p@ss0!').success).toBe(true);
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

    it('should reject a password with 5 characters', () => {
      const result = passwordSchema.safeParse('abcd1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('tooShort');
      }
    });

    it('should accept a password with exactly 6 characters', () => {
      expect(passwordSchema.safeParse('abcde1').success).toBe(true);
    });
  });

  describe('missingLetter', () => {
    it('should reject a password with only digits', () => {
      const result = passwordSchema.safeParse('123456');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingLetter');
      }
    });

    it('should reject a password with digits and special characters but no letters', () => {
      const result = passwordSchema.safeParse('123!@#');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingLetter');
      }
    });
  });

  describe('missingDigit', () => {
    it('should reject a password with only letters', () => {
      const result = passwordSchema.safeParse('abcdef');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingDigit');
      }
    });

    it('should reject a password with letters and special characters but no digits', () => {
      const result = passwordSchema.safeParse('abc!@#');
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('missingDigit');
      }
    });
  });

  describe('getPasswordValidationError', () => {
    it('should return null for a valid password', () => {
      expect(getPasswordValidationError('abcdef1')).toBeNull();
    });

    it('should return tooShort for a short password', () => {
      expect(getPasswordValidationError('ab1')).toBe('tooShort');
    });

    it('should return missingLetter for digits-only password of valid length', () => {
      expect(getPasswordValidationError('123456')).toBe('missingLetter');
    });

    it('should return missingDigit for letters-only password of valid length', () => {
      expect(getPasswordValidationError('abcdef')).toBe('missingDigit');
    });

    it('should return tooShort as the first error when multiple validations fail', () => {
      expect(getPasswordValidationError('1')).toBe('tooShort');
    });
  });

  describe('isPasswordValidationErrorKey', () => {
    it('should return true for tooShort', () => {
      expect(isPasswordValidationErrorKey('tooShort')).toBe(true);
    });

    it('should return true for missingLetter', () => {
      expect(isPasswordValidationErrorKey('missingLetter')).toBe(true);
    });

    it('should return true for missingDigit', () => {
      expect(isPasswordValidationErrorKey('missingDigit')).toBe(true);
    });

    it('should return true for weak', () => {
      expect(isPasswordValidationErrorKey('weak')).toBe(true);
    });

    it('should return false for an unknown key', () => {
      expect(isPasswordValidationErrorKey('unknownKey')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(isPasswordValidationErrorKey('')).toBe(false);
    });

    it('should return false for a key with similar but incorrect name', () => {
      expect(isPasswordValidationErrorKey('tooLong')).toBe(false);
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

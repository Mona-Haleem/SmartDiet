import { describe, it, expect } from '@jest/globals';
import {
  isValidPassword,
  isValidEmail,
  isValidUsername,
  isPasswordMatching,
  validators
} from '../../scripts_module/helpers/utils/validators.js';

describe('Validators - Unit Tests', () => {
  describe('isValidPassword', () => {
    it('should accept strong passwords', () => {
      expect(isValidPassword('Abc123!@#')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('Test123!')).toBe(true);
    });

    it('should reject passwords without uppercase', () => {
      expect(isValidPassword('abc123!@#')).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(isValidPassword('ABC123!@#')).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      expect(isValidPassword('Abc123456')).toBe(false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(isValidPassword('Abc12!')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('name+tag@company.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should accept usernames with 3+ characters', () => {
      expect(isValidUsername('abc')).toBe(true);
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('long_username_here')).toBe(true);
    });

    it('should reject usernames shorter than 3 characters', () => {
      expect(isValidUsername('ab')).toBe(false);
      expect(isValidUsername('a')).toBe(false);
      expect(isValidUsername('')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(isValidUsername('   ab   ')).toBe(false);
      expect(isValidUsername('   abc   ')).toBe(true);
    });
  });

  describe('isPasswordMatching', () => {
    it('should return true for matching passwords', () => {
      expect(isPasswordMatching('Pass123!', 'Pass123!')).toBe(true);
      expect(isPasswordMatching('same', 'same')).toBe(true);
    });

    it('should return false for non-matching passwords', () => {
      expect(isPasswordMatching('Pass123!', 'Pass456!')).toBe(false);
      expect(isPasswordMatching('different', 'passwords')).toBe(false);
    });
  });

  describe('validators object', () => {
    it('should have correct structure for each validator', () => {
      expect(validators.username).toHaveProperty('validate');
      expect(validators.username).toHaveProperty('errorMsg');
      expect(typeof validators.username.validate).toBe('function');
      expect(typeof validators.username.errorMsg).toBe('string');
    });

    it('should validate username correctly', () => {
      expect(validators.username.validate('validuser')).toBe(true);
      expect(validators.username.validate('ab')).toBe(false);
    });

    it('should validate email correctly', () => {
      expect(validators.email.validate('user@test.com')).toBe(true);
      expect(validators.email.validate('invalid')).toBe(false);
    });

    it('should validate login (email or username)', () => {
      expect(validators.login.validate('user@test.com')).toBe(true);
      expect(validators.login.validate('validuser')).toBe(true);
      expect(validators.login.validate('ab')).toBe(false);
    });

    it('should validate confirmation with second parameter', () => {
      expect(validators.confirmation.validate('Pass123!', 'Pass123!')).toBe(true);
      expect(validators.confirmation.validate('Pass123!', 'Different')).toBe(false);
    });
  });
});
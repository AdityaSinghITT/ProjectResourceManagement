import { PasswordValidationMessages } from '../../shared/constants/authMessages';

const MIN_PASSWORD_LENGTH = 8;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /[0-9]/;

export function validatePasswordStrength(password: string): string[] {
  const violations: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    violations.push(PasswordValidationMessages.MIN_LENGTH);
  }

  if (!UPPERCASE_PATTERN.test(password)) {
    violations.push(PasswordValidationMessages.UPPERCASE_REQUIRED);
  }

  if (!DIGIT_PATTERN.test(password)) {
    violations.push(PasswordValidationMessages.DIGIT_REQUIRED);
  }

  return violations;
}

export function isPasswordStrong(password: string): boolean {
  return validatePasswordStrength(password).length === 0;
}

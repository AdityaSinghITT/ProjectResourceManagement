export const AuthMessages = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  PASSWORD_CHANGE_REQUIRED: 'Password change required before accessing this resource',
  PASSWORDS_DO_NOT_MATCH: 'New password and confirm password do not match',
  PASSWORD_UPDATED: 'Password updated successfully',
  LOGGED_OUT: 'Logged out successfully',
  MISSING_AUTH_HEADER: 'Authorization header is required',
  INVALID_AUTH_FORMAT: 'Authorization header must use Bearer scheme',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  INSUFFICIENT_ROLE: 'You do not have permission to access this resource',
  USER_NOT_FOUND: 'User not found',
} as const;

export const PasswordValidationMessages = {
  MIN_LENGTH: 'Password must be at least 8 characters long',
  UPPERCASE_REQUIRED: 'Password must contain at least one uppercase letter',
  DIGIT_REQUIRED: 'Password must contain at least one number',
} as const;

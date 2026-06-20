export const ErrorMessages = {
  INVALID_JSON_BODY:
    'Invalid JSON request body. Check for trailing commas, missing quotes, or typos — especially after removing optional fields.',
  DATABASE_UNREACHABLE: 'Database is temporarily unreachable. Please retry in a few seconds.',
  DATABASE_HEALTH_UNREACHABLE:
    'Database is unreachable. Neon may be waking up — wait a few seconds and retry, or check DATABASE_URL in .env.',
  DATABASE_HEALTH_FAILED: 'Database health check failed.',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  UNIQUE_CONSTRAINT_VIOLATION: 'A record with the same unique value already exists.',
  FOREIGN_KEY_VIOLATION: 'Referenced record does not exist.',
  SCHEMA_OUT_OF_DATE: (column: string) =>
    `Database schema is out of date (missing column: ${column}). Run: npx prisma db push`,
} as const;

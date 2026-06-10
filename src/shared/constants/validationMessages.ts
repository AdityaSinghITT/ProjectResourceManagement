export const ValidationMessages = {
  INVALID_REQUEST_BODY: 'Invalid request body',
  INVALID_DATE_FORMAT: 'Invalid date format. Use YYYY-MM-DD.',
  START_DATE_BEFORE_END_DATE: 'Start date must be before end date',
  AT_LEAST_ONE_UPDATE_FIELD: 'At least one field must be provided for update',
  INVALID_POSITIVE_INTEGER: (fieldName: string, received: string) =>
    `Invalid ${fieldName}. Must be a positive integer (received: "${received}").`,
} as const;

import { z } from 'zod';

export function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

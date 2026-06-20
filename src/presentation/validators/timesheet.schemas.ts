import { z } from 'zod';
import { ValidationMessages } from '../../shared/constants/validationMessages';

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ValidationMessages.INVALID_DATE_FORMAT);

export const optionalWeekStartQuerySchema = z.object({
  weekStart: isoDateString.optional(),
});

export const weekStartParamSchema = z.object({
  weekStart: isoDateString,
});

export const submitTimesheetEntryTagSchema = z.object({
  activityTagId: z.number().int().positive('activityTagId must be a positive integer'),
  customText: z.string().trim().min(1).optional(),
});

export const submitTimesheetEntrySchema = z.object({
  projectId: z.number().int().positive('projectId must be a positive integer'),
  hours: z.number().positive('hours must be greater than 0'),
  tags: z.array(submitTimesheetEntryTagSchema).default([]),
});

export const submitTimesheetSchema = z.object({
  weekStart: isoDateString,
  entries: z.array(submitTimesheetEntrySchema).min(1, 'At least one project entry is required'),
});

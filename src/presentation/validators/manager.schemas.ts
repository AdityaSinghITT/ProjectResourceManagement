import { z } from 'zod';
import { ValidationMessages } from '../../shared/constants/validationMessages';

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ValidationMessages.INVALID_DATE_FORMAT);

export const allocationRequestSchema = z
  .object({
    employeeId: z.number().int().positive('Employee ID must be a positive integer'),
    projectId: z.number().int().positive('Project ID must be a positive integer'),
    utilizationPercent: z
      .number()
      .int()
      .min(1, 'Utilization must be at least 1%')
      .max(100, 'Utilization cannot exceed 100%'),
    fromDate: isoDateString,
    toDate: isoDateString,
  })
  .superRefine((data, ctx) => {
    if (data.fromDate >= data.toDate) {
      ctx.addIssue({
        code: 'custom',
        message: ValidationMessages.START_DATE_BEFORE_END_DATE,
        path: ['toDate'],
      });
    }
  });

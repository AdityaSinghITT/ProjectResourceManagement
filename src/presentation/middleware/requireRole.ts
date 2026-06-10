import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { AuthMessages } from '../../shared/constants/authMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(
        new AppError(
          HttpStatus.UNAUTHORIZED,
          AuthMessages.INVALID_OR_EXPIRED_TOKEN,
          ErrorTitles.UNAUTHORIZED,
        ),
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          HttpStatus.FORBIDDEN,
          AuthMessages.INSUFFICIENT_ROLE,
          ErrorTitles.FORBIDDEN,
        ),
      );
      return;
    }

    next();
  };
}

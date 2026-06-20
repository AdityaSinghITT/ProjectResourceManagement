import { PermissionAction, PermissionResource } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { AuthMessages } from '../../shared/constants/authMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { permissionKey } from '../../shared/constants/permissionDefinitions';

export function requirePermission(resource: PermissionResource, action: PermissionAction) {
  const required = permissionKey(resource, action);

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

    if (!req.user.permissions.includes(required)) {
      next(
        new AppError(
          HttpStatus.FORBIDDEN,
          AuthMessages.INSUFFICIENT_PERMISSION,
          ErrorTitles.FORBIDDEN,
        ),
      );
      return;
    }

    next();
  };
}

export function requireAnyPermission(
  ...requirements: Array<{ resource: PermissionResource; action: PermissionAction }>
) {
  const requiredKeys = requirements.map((item) => permissionKey(item.resource, item.action));

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

    const allowed = requiredKeys.some((key) => req.user!.permissions.includes(key));
    if (!allowed) {
      next(
        new AppError(
          HttpStatus.FORBIDDEN,
          AuthMessages.INSUFFICIENT_PERMISSION,
          ErrorTitles.FORBIDDEN,
        ),
      );
      return;
    }

    next();
  };
}

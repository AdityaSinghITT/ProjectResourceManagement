import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { AuthMessages } from '../../shared/constants/authMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

export function requirePasswordChanged(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.forcePasswordChange) {
    next(
      new AppError(
        HttpStatus.FORBIDDEN,
        AuthMessages.PASSWORD_CHANGE_REQUIRED,
        ErrorTitles.FORBIDDEN,
      ),
    );
    return;
  }

  next();
}

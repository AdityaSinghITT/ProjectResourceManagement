import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../../infrastructure/auth/jwt';
import { AppError } from '../../shared/errors/AppError';
import { AuthMessages } from '../../shared/constants/authMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new AppError(
      HttpStatus.UNAUTHORIZED,
      AuthMessages.MISSING_AUTH_HEADER,
      ErrorTitles.UNAUTHORIZED,
    );
  }

  if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
    throw new AppError(
      HttpStatus.UNAUTHORIZED,
      AuthMessages.INVALID_AUTH_FORMAT,
      ErrorTitles.UNAUTHORIZED,
    );
  }

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();

  if (!token) {
    throw new AppError(
      HttpStatus.UNAUTHORIZED,
      AuthMessages.INVALID_AUTH_FORMAT,
      ErrorTitles.UNAUTHORIZED,
    );
  }

  return token;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      forcePasswordChange: payload.forcePasswordChange,
    };

    next();
  } catch {
    next(
      new AppError(
        HttpStatus.UNAUTHORIZED,
        AuthMessages.INVALID_OR_EXPIRED_TOKEN,
        ErrorTitles.UNAUTHORIZED,
      ),
    );
  }
}

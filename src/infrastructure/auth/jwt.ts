import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AccessTokenClaims } from '../../domain/types/auth.types';
import { UserProfile } from '../../domain/types/user.types';

const SECONDS_PER_HOUR = 3600;

function resolveExpiresInSeconds(expiresIn: string): number {
  const hoursMatch = expiresIn.match(/^(\d+)h$/);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10) * SECONDS_PER_HOUR;
  }

  const seconds = parseInt(expiresIn, 10);
  return Number.isNaN(seconds) ? 24 * SECONDS_PER_HOUR : seconds;
}

export function buildAccessTokenClaims(user: UserProfile): AccessTokenClaims {
  return {
    sub: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    forcePasswordChange: user.forcePasswordChange,
  };
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.jwtSecret, {
    expiresIn: resolveExpiresInSeconds(env.jwtExpiresIn),
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  return decoded as unknown as AccessTokenClaims;
}

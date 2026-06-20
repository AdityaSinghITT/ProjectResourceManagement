import { Request, Response } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { AuthMessages } from '../../shared/constants/authMessages';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { ErrorTitles } from '../../shared/constants/httpStatusCodes';
import { parseBody } from '../../shared/utils/parseBody';
import {
  changePasswordSchema,
  loginSchema,
} from '../validators/auth.schemas';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(loginSchema, req.body);
    const result = await this.authService.login(body);
    res.status(HttpStatus.OK).json(result);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(changePasswordSchema, req.body);

    if (!req.user) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        AuthMessages.INVALID_OR_EXPIRED_TOKEN,
        ErrorTitles.UNAUTHORIZED,
      );
    }

    const result = await this.authService.changePassword({
      userId: req.user.id,
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    });

    res.status(HttpStatus.OK).json(result);
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        AuthMessages.INVALID_OR_EXPIRED_TOKEN,
        ErrorTitles.UNAUTHORIZED,
      );
    }

    const profile = await this.authService.getProfile(req.user.id);
    res.status(HttpStatus.OK).json({ user: profile });
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    res.status(HttpStatus.OK).json({ message: AuthMessages.LOGGED_OUT });
  };
}

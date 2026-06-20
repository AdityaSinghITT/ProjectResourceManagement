import { Router } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/UserRepository';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { AuthRoutes } from '../../shared/constants/apiRoutes';

const userRepository = new PrismaUserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.post(AuthRoutes.LOGIN, asyncHandler(authController.login));

authRouter.post(
  AuthRoutes.CHANGE_PASSWORD,
  authenticate,
  asyncHandler(authController.changePassword),
);

authRouter.get(
  AuthRoutes.ME,
  authenticate,
  requirePasswordChanged,
  asyncHandler(authController.getProfile),
);

authRouter.post(
  AuthRoutes.LOGOUT,
  authenticate,
  requirePasswordChanged,
  asyncHandler(authController.logout),
);

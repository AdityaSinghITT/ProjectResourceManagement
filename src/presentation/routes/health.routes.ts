import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../../infrastructure/prisma/checkConnection';
import { ErrorMessages } from '../../shared/constants/errorMessages';
import { isDatabaseUnreachableError } from '../../shared/utils/prismaErrors';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await checkDatabaseConnection();
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = isDatabaseUnreachableError(error)
      ? ErrorMessages.DATABASE_HEALTH_UNREACHABLE
      : ErrorMessages.DATABASE_HEALTH_FAILED;

    console.error('Health check failed:', error);

    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      message,
      statusCode: 503,
      timestamp: new Date().toISOString(),
    });
  }
});

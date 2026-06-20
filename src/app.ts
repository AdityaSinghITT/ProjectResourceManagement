import express from 'express';
import cors from 'cors';
import { ApiRoutes } from './shared/constants/apiRoutes';
import { requestLogger } from './presentation/middleware/requestLogger';
import { errorHandler } from './presentation/middleware/errorHandler';
import { healthRouter } from './presentation/routes/health.routes';
import { authRouter } from './presentation/routes/auth.routes';
import { adminRouter } from './presentation/routes/admin.routes';
import { activityTagsRouter, activityTagsBasePath } from './presentation/routes/activityTags.routes';
import { employeeRouter, employeeBasePath } from './presentation/routes/employee.routes';
import { managerRouter, managerBasePath } from './presentation/routes/manager.routes';
import { setupSwagger } from './swagger/setupSwagger';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  setupSwagger(app);

  app.use(ApiRoutes.HEALTH, healthRouter);
  app.use(ApiRoutes.AUTH_BASE, authRouter);
  app.use(ApiRoutes.ADMIN_BASE, adminRouter);
  app.use(managerBasePath, managerRouter);
  app.use(employeeBasePath, employeeRouter);
  app.use(activityTagsBasePath, activityTagsRouter);

  app.use(errorHandler);

  return app;
}

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { ApiRoutes } from '../shared/constants/apiRoutes';
import { openApiSpec } from './openapi';

export function setupSwagger(app: Express): void {
  app.use(ApiRoutes.API_DOCS, swaggerUi.serve, swaggerUi.setup(openApiSpec));
}

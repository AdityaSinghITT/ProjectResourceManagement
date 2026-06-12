import { Request, Response } from 'express';
import { AIService } from '../../application/services/AIService';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { ErrorTitles } from '../../shared/constants/httpStatusCodes';
import { AuthMessages } from '../../shared/constants/authMessages';
import { parseBody } from '../../shared/utils/parseBody';
import { parsePositiveIntParam } from '../../shared/utils/parseParams';
import { skillMatchSchema, teamBuilderSchema } from '../validators/ai.schemas';

export class ManagerAiController {
  constructor(private readonly aiService: AIService) {}

  skillMatch = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(skillMatchSchema, req.body);
    this.requireUserId(req);
    const result = await this.aiService.skillMatch(body.requirement);
    res.status(HttpStatus.OK).json(result);
  };

  allocationsAiMatch = async (req: Request, res: Response): Promise<void> => {
    await this.skillMatch(req, res);
  };

  teamBuilder = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(teamBuilderSchema, req.body);
    this.requireUserId(req);
    const result = await this.aiService.buildTeam(body.requirement);
    res.status(HttpStatus.OK).json(result);
  };

  projectRiskSummary = async (req: Request, res: Response): Promise<void> => {
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const managerUserId = this.requireUserId(req);
    const result = await this.aiService.riskSummary(managerUserId, projectId);
    res.status(HttpStatus.OK).json(result);
  };

  private requireUserId(req: Request): number {
    if (!req.user) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        AuthMessages.INVALID_OR_EXPIRED_TOKEN,
        ErrorTitles.UNAUTHORIZED,
      );
    }

    return req.user.id;
  }
}

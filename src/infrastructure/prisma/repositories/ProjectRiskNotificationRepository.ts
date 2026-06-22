import { prisma } from '../client';
import { IProjectRiskNotificationRepository } from '../../../domain/interfaces/IProjectRiskNotificationRepository';

export class PrismaProjectRiskNotificationRepository implements IProjectRiskNotificationRepository {
  async wasNotified(projectId: number, evaluatedWeekStart: Date): Promise<boolean> {
    const record = await prisma.projectRiskNotification.findUnique({
      where: {
        projectId_evaluatedWeekStart: {
          projectId,
          evaluatedWeekStart,
        },
      },
    });

    return Boolean(record);
  }

  async recordSent(projectId: number, evaluatedWeekStart: Date): Promise<void> {
    await prisma.projectRiskNotification.upsert({
      where: {
        projectId_evaluatedWeekStart: {
          projectId,
          evaluatedWeekStart,
        },
      },
      create: {
        projectId,
        evaluatedWeekStart,
      },
      update: {
        sentAt: new Date(),
      },
    });
  }
}

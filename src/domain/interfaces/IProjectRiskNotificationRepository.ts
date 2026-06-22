export interface IProjectRiskNotificationRepository {
  wasNotified(projectId: number, evaluatedWeekStart: Date): Promise<boolean>;
  recordSent(projectId: number, evaluatedWeekStart: Date): Promise<void>;
}

import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';

export interface ManagerDeactivationEffects {
  clearedTeamMembers: number;
  projectsPutOnHold: number;
}

export async function applyManagerDeactivationEffects(
  resourceProfileRepository: IResourceProfileRepository,
  projectRepository: IProjectRepository,
  managerUserId: number,
): Promise<ManagerDeactivationEffects> {
  const clearedTeamMembers =
    await resourceProfileRepository.clearReportingManagerForTeam(managerUserId);
  const projectsPutOnHold = await projectRepository.holdActiveProjectsByManager(managerUserId);

  return { clearedTeamMembers, projectsPutOnHold };
}

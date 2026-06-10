import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';

export interface ManagerDeactivationEffects {
  clearedTeamMembers: number;
  projectsPutOnHold: number;
}

export async function applyManagerDeactivationEffects(
  employeeRepository: IEmployeeRepository,
  projectRepository: IProjectRepository,
  managerUserId: number,
): Promise<ManagerDeactivationEffects> {
  const clearedTeamMembers = await employeeRepository.clearReportingManagerForTeam(managerUserId);
  const projectsPutOnHold = await projectRepository.holdActiveProjectsByManager(managerUserId);

  return { clearedTeamMembers, projectsPutOnHold };
}

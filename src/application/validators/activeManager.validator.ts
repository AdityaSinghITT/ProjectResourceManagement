import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { AppError } from '../../shared/errors/AppError';
import { AdminMessages } from '../../shared/constants/adminMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { RoleNames } from '../../shared/constants/roleNames';

export async function validateActiveProjectManager(
  managerUserId: number,
  userRepository: IUserRepository,
  resourceProfileRepository: IResourceProfileRepository,
): Promise<void> {
  const user = await userRepository.findById(managerUserId);

  if (!user || user.role !== RoleNames.MANAGER) {
    throw new AppError(HttpStatus.BAD_REQUEST, AdminMessages.INVALID_MANAGER, ErrorTitles.BAD_REQUEST);
  }

  if (!user.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INACTIVE_MANAGER_CANNOT_BE_ASSIGNED,
      ErrorTitles.BAD_REQUEST,
    );
  }

  const profile = await resourceProfileRepository.findByUserId(managerUserId);

  if (!profile || !profile.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INACTIVE_MANAGER_CANNOT_BE_ASSIGNED,
      ErrorTitles.BAD_REQUEST,
    );
  }
}

export async function validateActiveReportingManager(
  managerUserId: number,
  userRepository: IUserRepository,
  resourceProfileRepository: IResourceProfileRepository,
): Promise<void> {
  const user = await userRepository.findById(managerUserId);

  if (!user || user.role !== RoleNames.MANAGER || !user.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INVALID_REPORTING_MANAGER,
      ErrorTitles.BAD_REQUEST,
    );
  }

  const profile = await resourceProfileRepository.findByUserId(managerUserId);

  if (!profile || !profile.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INVALID_REPORTING_MANAGER,
      ErrorTitles.BAD_REQUEST,
    );
  }
}

import { Role } from '@prisma/client';
import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { AppError } from '../../shared/errors/AppError';
import { AdminMessages } from '../../shared/constants/adminMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

export async function validateActiveProjectManager(
  managerUserId: number,
  userRepository: IUserRepository,
  employeeRepository: IEmployeeRepository,
): Promise<void> {
  const user = await userRepository.findById(managerUserId);

  if (!user || user.role !== Role.MANAGER) {
    throw new AppError(HttpStatus.BAD_REQUEST, AdminMessages.INVALID_MANAGER, ErrorTitles.BAD_REQUEST);
  }

  if (!user.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INACTIVE_MANAGER_CANNOT_BE_ASSIGNED,
      ErrorTitles.BAD_REQUEST,
    );
  }

  const employee = await employeeRepository.findByUserId(managerUserId);

  if (!employee || !employee.isActive) {
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
  employeeRepository: IEmployeeRepository,
): Promise<void> {
  const user = await userRepository.findById(managerUserId);

  if (!user || user.role !== Role.MANAGER || !user.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INVALID_REPORTING_MANAGER,
      ErrorTitles.BAD_REQUEST,
    );
  }

  const employee = await employeeRepository.findByUserId(managerUserId);

  if (!employee || !employee.isActive) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      AdminMessages.INVALID_REPORTING_MANAGER,
      ErrorTitles.BAD_REQUEST,
    );
  }
}

import { Role } from '@prisma/client';

export function isEmployeeOrManagerRole(role: Role): boolean {
  return role === Role.EMPLOYEE || role === Role.MANAGER;
}

export function requiresEmployeeProfile(role: Role): boolean {
  return isEmployeeOrManagerRole(role);
}

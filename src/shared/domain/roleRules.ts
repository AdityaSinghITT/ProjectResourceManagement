import { Department, Designation } from '@prisma/client';
import { RoleName, RoleNames } from '../constants/roleNames';

export function isResourceOrManagerRole(role: RoleName): boolean {
  return role === RoleNames.RESOURCE || role === RoleNames.MANAGER;
}

export function requiresResourceProfile(role: RoleName): boolean {
  return isResourceOrManagerRole(role);
}

export function parseDepartment(value: string): Department {
  return value as Department;
}

export function parseDesignation(value: string): Designation {
  return value as Designation;
}

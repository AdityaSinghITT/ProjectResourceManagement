import { UserRole } from '../api/types/auth.types';
import { Screen } from '../navigation/Screen';
import { AdminMenuScreen } from '../screens/admin/AdminMenuScreen';
import { EmployeeMenuScreen } from '../screens/employee/EmployeeMenuScreen';
import { ManagerMenuScreen } from '../screens/manager/ManagerMenuScreen';

export function createRoleMenuScreen(role: UserRole): Screen {
  switch (role) {
    case 'ADMIN':
      return AdminMenuScreen;
    case 'MANAGER':
      return ManagerMenuScreen;
    case 'EMPLOYEE':
      return EmployeeMenuScreen;
    default:
      throw new Error(`Unsupported role: ${role}`);
  }
}

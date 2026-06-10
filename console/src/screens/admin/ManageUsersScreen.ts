import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { printApiError } from '../../ui/handleApiError';

export const ManageUsersScreen: Screen = {
  name: 'ManageUsersScreen',

  async run(context) {
    console.clear();
    drawTitle('MANAGE USERS');
    console.log('1. Create User Account');
    console.log('2. View All Users');
    console.log('3. Reset User Password');
    console.log('4. Deactivate User');
    console.log('5. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    try {
      switch (choice) {
        case '1':
          await createUser(context);
          break;
        case '2':
          await viewUsers(context);
          break;
        case '3':
          await resetPassword(context);
          break;
        case '4':
          await deactivateUser(context);
          break;
        case '5':
          return { type: 'back' };
        default:
          console.log('\nInvalid option.');
      }
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return choice === '5' ? { type: 'back' } : { type: 'stay' };
  },
};

async function createUser(context: AppContext): Promise<void> {
  const fullName = await context.prompt.ask('Full Name         : ');
  const email = await context.prompt.ask('Email             : ');
  const username = await context.prompt.ask('Username          : ');
  const temporaryPassword = await context.prompt.ask('Temporary Password: ');
  const roleChoice = await context.prompt.ask('Role (1) Admin (2) Manager (3) Employee: ');
  const roleMap: Record<string, string> = { '1': 'ADMIN', '2': 'MANAGER', '3': 'EMPLOYEE' };
  const role = roleMap[roleChoice] ?? 'EMPLOYEE';

  const body: Record<string, string> = {
    fullName,
    email,
    username,
    temporaryPassword,
    role,
  };

  if (role === 'EMPLOYEE' || role === 'MANAGER') {
    body.department = await context.prompt.ask('Department: ');
    body.designation = await context.prompt.ask('Designation: ');
  }

  const result = await context.admin.createUser(body);
  console.log('\nAccount created. User must change password on first login.', result);
}

async function viewUsers(context: AppContext): Promise<void> {
  const result = await context.admin.listUsers();
  printTable(
    ['ID', 'Username', 'Role', 'Status'],
    result.users.map((user) => [
      String(user.id),
      user.username,
      user.role,
      user.isActive ? 'Active' : 'Inactive',
    ]),
  );
  console.log(`\nTotal: ${result.summary.total}   |   Active: ${result.summary.active}   |   Inactive: ${result.summary.inactive}`);

  const reactivate = await context.prompt.ask('\n[R] Reactivate a user or Enter to continue: ');
  if (reactivate.toUpperCase() === 'R') {
    const userId = Number(await context.prompt.ask('Enter User ID to reactivate: '));
    await context.admin.reactivateUser(userId);
    console.log('\nAccount reactivated.');
  }
}

async function resetPassword(context: AppContext): Promise<void> {
  const identifier = await context.prompt.ask('Enter Username or User ID: ');
  const newTemporaryPassword = await context.prompt.ask('New Temporary Password: ');
  await context.admin.resetUserPasswordByIdentifier(identifier, newTemporaryPassword);
  console.log('\nPassword reset. User will be prompted to change it on next login.');
}

async function deactivateUser(context: AppContext): Promise<void> {
  const userId = Number(await context.prompt.ask('Enter User ID: '));
  const confirm = await context.prompt.ask('Deactivate this user? [Y/N]: ');
  if (confirm.toUpperCase() === 'Y') {
    await context.admin.deactivateUser(userId);
    console.log('\nUser deactivated.');
  }
}

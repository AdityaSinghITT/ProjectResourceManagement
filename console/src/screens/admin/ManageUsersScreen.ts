import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { printApiError } from '../../ui/handleApiError';
import { runResetUserPassword } from './ResetUserPasswordScreen';

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
          await runResetUserPassword(context);
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
  const temporaryPassword = await context.prompt.askHidden('Temporary Password: ');
  const roleChoice = await context.prompt.ask('Role (1) Admin (2) Manager (3) Resource: ');
  const roleMap: Record<string, string> = { '1': 'ADMIN', '2': 'MANAGER', '3': 'RESOURCE' };
  const role = roleMap[roleChoice] ?? 'RESOURCE';

  const body: Record<string, string> = {
    fullName,
    email,
    username,
    temporaryPassword,
    role,
  };

  if (role === 'RESOURCE' || role === 'MANAGER') {
    body.department = await context.prompt.ask(
      'Department (ENGINEERING/QUALITY_ASSURANCE/DEVOPS/PRODUCT/HUMAN_RESOURCES): ',
    );
    body.designation = await context.prompt.ask(
      'Designation (SOFTWARE_ENGINEER/SENIOR_SOFTWARE_ENGINEER/TEAM_LEAD/PROJECT_MANAGER/QA_ENGINEER/DEVOPS_ENGINEER/BUSINESS_ANALYST): ',
    );
  }

  const result = await context.admin.createUser(body);
  console.log(`\n${result.message}`);
  console.log(`User ID: ${result.user.id}   Username: ${result.user.username}`);
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

async function deactivateUser(context: AppContext): Promise<void> {
  const userId = Number(await context.prompt.ask('Enter User ID: '));
  const confirm = await context.prompt.ask('Deactivate this user? [Y/N]: ');
  if (confirm.toUpperCase() === 'Y') {
    await context.admin.deactivateUser(userId);
    console.log('\nUser deactivated.');
  }
}

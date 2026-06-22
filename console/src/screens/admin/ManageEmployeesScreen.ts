import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { printApiError } from '../../ui/handleApiError';

export const ManageEmployeesScreen: Screen = {
  name: 'ManageEmployeesScreen',

  async run(context) {
    console.clear();
    drawTitle('MANAGE EMPLOYEES');
    console.log('1. View All Employees');
    console.log('2. Update Employee');
    console.log('3. Deactivate Employee');
    console.log('4. Manage Employee Skills');
    console.log('5. Assign Manager');
    console.log('6. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    try {
      switch (choice) {
        case '1':
          await viewEmployees(context);
          break;
        case '2':
          await updateEmployee(context);
          break;
        case '3':
          await deactivateEmployee(context);
          break;
        case '4':
          await manageSkills(context);
          break;
        case '5':
          await assignManager(context);
          break;
        case '6':
          return { type: 'back' };
        default:
          console.log('\nInvalid option.');
      }
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return choice === '6' ? { type: 'back' } : { type: 'stay' };
  },
};

async function viewEmployees(context: AppContext): Promise<void> {
  const filter = await context.prompt.ask('[F] Filter by status/department or Enter to list all: ');
  let status: string | undefined;
  let department: string | undefined;

  if (filter.toUpperCase() === 'F') {
    status = (await context.prompt.ask('Status (BENCH/ALLOCATED) or blank: ')) || undefined;
    department = (await context.prompt.ask('Department or blank: ')) || undefined;
  }

  const result = await context.admin.listEmployees({ status, department });
  printTable(
    ['ID', 'Name', 'Department', 'Status'],
    result.employees.map((employee) => [
      String(employee.id),
      employee.fullName,
      employee.department,
      employee.status,
    ]),
  );
  console.log(`\nTotal: ${result.summary.total}   |   Allocated: ${result.summary.allocated}   |   Bench: ${result.summary.bench}`);
}

async function updateEmployee(context: AppContext): Promise<void> {
  const employeeId = Number(await context.prompt.ask('Enter Resource profile ID: '));
  const department = await context.prompt.ask(
    'New Department (ENGINEERING/QUALITY_ASSURANCE/DEVOPS/PRODUCT/HUMAN_RESOURCES, blank to skip): ',
  );
  const designation = await context.prompt.ask(
    'New Designation (SOFTWARE_ENGINEER/SENIOR_SOFTWARE_ENGINEER/TEAM_LEAD/PROJECT_MANAGER/QA_ENGINEER/DEVOPS_ENGINEER/BUSINESS_ANALYST, blank to skip): ',
  );
  const body: Record<string, string> = {};
  if (department) body.department = department;
  if (designation) body.designation = designation;
  const result = await context.admin.updateEmployee(employeeId, body);
  console.log('\nEmployee updated.', result);
}

async function deactivateEmployee(context: AppContext): Promise<void> {
  const employeeId = Number(await context.prompt.ask('Enter Resource profile ID: '));
  const preview = await context.admin.previewEmployeeDeactivation(employeeId);
  const resourceStatus = preview.employee.resourceStatus ?? preview.employee.status ?? 'UNKNOWN';
  console.log(`\n── ${preview.employee.fullName} ──`);
  console.log(`Department : ${preview.employee.department ?? '—'}`);
  console.log(`Status     : ${resourceStatus}`);

  if (preview.activeAllocations.length > 0) {
    console.log(`\nWarning: ${preview.activeAllocations.length} active allocation(s) will be ended.`);
    for (const allocation of preview.activeAllocations) {
      console.log(`  - ${allocation.projectName} (${allocation.utilizationPercent}%)`);
    }
  }

  const confirm = await context.prompt.ask('\n[Y] Yes, Deactivate     [B] Cancel\nChoice: ');
  if (confirm.toUpperCase() === 'Y') {
    const result = await context.admin.deactivateEmployee(employeeId);
    console.log('\nEmployee deactivated.', result);
  }
}

async function manageSkills(context: AppContext): Promise<void> {
  const employeeId = Number(await context.prompt.ask('Enter Employee ID: '));
  const { skills } = await context.admin.listEmployeeSkills(employeeId);
  console.log('\nCurrent Skills:');
  skills.forEach((skill, index) => {
    console.log(`  ${index + 1}. ${skill.skillName}  (${skill.proficiency})`);
  });

  console.log('\n1. Add Skill   2. Update Proficiency   3. Remove Skill');
  const action = await context.prompt.ask('Choice: ');

  if (action === '1') {
    const skillName = await context.prompt.ask('Skill Name: ');
    const category = await context.prompt.ask('Category (BACKEND/FRONTEND/DEVOPS/QA/OTHER): ');
    const proficiency = await context.prompt.ask('Proficiency (BEGINNER/INTERMEDIATE/ADVANCED): ');
    await context.admin.addEmployeeSkill(employeeId, { skillName, category, proficiency });
    console.log('\nSkill added.');
  } else if (action === '2') {
    const listNumber = Number(await context.prompt.ask('Skill # (from list above): '));
    const skill = skills[listNumber - 1];
    if (!skill) {
      console.log('\nInvalid skill number.');
      return;
    }
    const proficiency = await context.prompt.ask('New Proficiency: ');
    await context.admin.updateEmployeeSkill(employeeId, skill.id, proficiency);
    console.log('\nProficiency updated.');
  } else if (action === '3') {
    const listNumber = Number(await context.prompt.ask('Skill # (from list above): '));
    const skill = skills[listNumber - 1];
    if (!skill) {
      console.log('\nInvalid skill number.');
      return;
    }
    await context.admin.removeEmployeeSkill(employeeId, skill.id);
    console.log('\nSkill removed.');
  }
}

async function assignManager(context: AppContext): Promise<void> {
  const employeeUserId = Number(await context.prompt.ask('Employee User ID : '));
  const managerUserId = Number(await context.prompt.ask('Manager User ID  : '));
  await context.admin.assignManager(employeeUserId, managerUserId);
  console.log('\nManager assigned.');
}

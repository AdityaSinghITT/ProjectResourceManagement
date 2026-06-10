import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { parseDisplayDateToApi, formatApiDateForDisplay } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const ManageProjectsScreen: Screen = {
  name: 'ManageProjectsScreen',

  async run(context) {
    console.clear();
    drawTitle('MANAGE PROJECTS');
    console.log('1. Create Project');
    console.log('2. View All Projects');
    console.log('3. Update Project Details');
    console.log('4. Manage Milestones');
    console.log('5. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    try {
      switch (choice) {
        case '1':
          await createProject(context);
          break;
        case '2':
          await viewProjects(context);
          break;
        case '3':
          await updateProject(context);
          break;
        case '4':
          await manageMilestones(context);
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

async function createProject(context: AppContext): Promise<void> {
  const name = await context.prompt.ask('Project Name        : ');
  const description = await context.prompt.ask('Description         : ');
  const startDate = parseDisplayDateToApi(await context.prompt.ask('Start Date (DD-MM-YYYY): '));
  const endDate = parseDisplayDateToApi(await context.prompt.ask('End Date (DD-MM-YYYY)  : '));
  const statusChoice = await context.prompt.ask('Status (1) PLANNED (2) ACTIVE (3) ON_HOLD: ');
  const statusMap: Record<string, string> = { '1': 'PLANNED', '2': 'ACTIVE', '3': 'ON_HOLD' };
  const managerId = Number(await context.prompt.ask('Assign Manager (User ID): '));
  const totalStoryPoints = Number(await context.prompt.ask('Total Story Points  : '));

  const project = await context.admin.createProject({
    name,
    description,
    startDate,
    endDate,
    status: statusMap[statusChoice] ?? 'PLANNED',
    managerId,
    totalStoryPoints,
  });
  console.log(`\nProject created with ID ${project.id}.`);
}

async function viewProjects(context: AppContext): Promise<void> {
  const { projects } = await context.admin.listProjects();
  printTable(
    ['ID', 'Name', 'Manager', 'End Date', 'Status', 'SP Done/Total'],
    projects.map((project) => [
      String(project.id),
      project.name,
      project.managerName,
      formatApiDateForDisplay(project.endDate),
      project.status,
      `${project.completedStoryPoints} / ${project.totalStoryPoints}`,
    ]),
  );
}

async function updateProject(context: AppContext): Promise<void> {
  const projectId = Number(await context.prompt.ask('Enter Project ID: '));
  const name = await context.prompt.ask('Project Name (blank to skip): ');
  const description = await context.prompt.ask('Description (blank to skip): ');
  const body: Record<string, unknown> = {};
  if (name) body.name = name;
  if (description) body.description = description;
  await context.admin.updateProject(projectId, body);
  console.log('\nProject updated.');
}

async function manageMilestones(context: AppContext): Promise<void> {
  const projectId = Number(await context.prompt.ask('Enter Project ID: '));
  const milestones = await context.admin.listMilestones(projectId);
  printTable(
    ['#', 'Title', 'Due Date', 'SP', 'Status'],
    milestones.milestones.map((milestone, index) => [
      String(index + 1),
      milestone.title,
      formatApiDateForDisplay(milestone.dueDate),
      String(milestone.storyPoints),
      milestone.status,
    ]),
  );

  console.log('\n1. Add Milestone   2. Update Milestone Status');
  const action = await context.prompt.ask('Choice: ');

  if (action === '1') {
    const title = await context.prompt.ask('Milestone Title: ');
    const dueDate = parseDisplayDateToApi(await context.prompt.ask('Due Date (DD-MM-YYYY): '));
    const storyPoints = Number(await context.prompt.ask('Story Points: '));
    await context.admin.createMilestone(projectId, {
      title,
      dueDate,
      storyPoints,
      status: 'NOT_STARTED',
    });
    console.log('\nMilestone added.');
  } else if (action === '2') {
    const milestoneId = Number(await context.prompt.ask('Milestone ID: '));
    const statusChoice = await context.prompt.ask('Status (1) NOT_STARTED (2) IN_PROGRESS (3) DONE: ');
    const statusMap: Record<string, string> = {
      '1': 'NOT_STARTED',
      '2': 'IN_PROGRESS',
      '3': 'DONE',
    };
    await context.admin.updateMilestone(projectId, milestoneId, {
      status: statusMap[statusChoice],
    });
    console.log('\nMilestone updated.');
  }
}

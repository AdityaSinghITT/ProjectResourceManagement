import { Screen } from '../../navigation/Screen';
import {
  ActivityTag,
  SubmitTimesheetEntryInput,
  SubmitTimesheetEntryTagInput,
} from '../../api/types/employee.types';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { formatApiDateForDisplay, parseWeekStartInput } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const SubmitTimesheetScreen: Screen = {
  name: 'SubmitTimesheetScreen',

  async run(context) {
    console.clear();
    drawTitle('SUBMIT TIMESHEET');

    const user = context.session.getUser();
    console.log(`Employee  : ${user?.fullName ?? 'Unknown'}`);

    try {
      const reminder = await context.employee.getReminder();
      if (reminder.submissionFrozen) {
        console.log(`\n${reminder.message ?? 'Timesheet submission is frozen.'}\n`);
        await context.prompt.pause();
        return { type: 'back' };
      }
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'back' };
    }

    const weekInput = await context.prompt.ask(
      'Week Start: Enter date (DD-MM-YYYY) or press Enter for current week Monday\n> ',
    );

    let weekStartApi: string;
    try {
      weekStartApi = parseWeekStartInput(weekInput);
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'back' };
    }

    console.log(`\nUsing week starting: ${formatApiDateForDisplay(weekStartApi)} (API: ${weekStartApi})`);
    console.log('Note: weekStart must be a Monday (YYYY-MM-DD on server).\n');

    let allocationsResult;
    let tagsCatalog: ActivityTag[];

    try {
      console.log('Checking your active allocations for this week...\n');
      [allocationsResult, tagsCatalog] = await Promise.all([
        context.employee.getAllocations(weekStartApi),
        context.activityTags.list().then((r) => r.tags),
      ]);
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'back' };
    }

    if (allocationsResult.allocations.length === 0) {
      console.log('No project allocations found for this week. Cannot submit a timesheet.');
      await context.prompt.pause();
      return { type: 'back' };
    }

    const otherTag = tagsCatalog.find((tag) => tag.name.toLowerCase() === 'other');
    const entries: SubmitTimesheetEntryInput[] = [];
    let totalHours = 0;

    for (let index = 0; index < allocationsResult.allocations.length; index += 1) {
      const allocation = allocationsResult.allocations[index];
      drawDivider();
      console.log(`PROJECT ${index + 1} OF ${allocationsResult.allocations.length} — ${allocation.projectName}`);
      console.log(
        `  Allocation: ${allocation.utilizationPercent}%   |   Max: ${allocation.maxHoursForWeek} hrs (from server)\n`,
      );

      const hoursRaw = await context.prompt.ask('Hours worked this week (0 to skip): ');
      const hours = Number(hoursRaw);

      if (Number.isNaN(hours) || hours < 0) {
        console.log('\nInvalid hours value.');
        await context.prompt.pause();
        return { type: 'stay' };
      }

      if (hours === 0) {
        continue;
      }

      printActivityTagMenu(tagsCatalog);
      const tagSelection = await context.prompt.ask(
        'Select tags (comma-separated numbers, e.g. 1,2): ',
      );

      const tags = await buildTagsFromSelection(
        context,
        tagSelection,
        tagsCatalog,
        otherTag?.id,
      );

      if (tags === null) {
        await context.prompt.pause();
        return { type: 'stay' };
      }

      entries.push({
        projectId: allocation.projectId,
        hours,
        tags,
      });
      totalHours += hours;
    }

    if (entries.length === 0) {
      console.log('\nAt least one project entry with hours > 0 is required.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    drawDivider();
    console.log('SUMMARY');
    for (const entry of entries) {
      const project = allocationsResult.allocations.find((a) => a.projectId === entry.projectId);
      const tagLabels = entry.tags
        .map((tag) => {
          const name = tagsCatalog.find((t) => t.id === tag.activityTagId)?.name ?? String(tag.activityTagId);
          return tag.customText ? `${name} (${tag.customText})` : name;
        })
        .join(', ');
      console.log(`  ${project?.projectName ?? entry.projectId}    ${entry.hours} hrs    [${tagLabels}]`);
    }
    console.log(`  Total: ${totalHours} hrs\n`);

    const confirm = await context.prompt.ask('[S] Submit Timesheet     [B] Back\nChoice: ');
    if (confirm.toUpperCase() !== 'S') {
      return { type: 'back' };
    }

    try {
      const result = await context.employee.submitTimesheet({
        weekStart: weekStartApi,
        entries,
      });
      console.log(`\n${result.message}`);
      console.log(`Status: ${result.timesheet.status} | Total: ${result.timesheet.totalHours} hrs`);
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return { type: 'back' };
  },
};

function printActivityTagMenu(tags: ActivityTag[]): void {
  console.log('\nWhat did you work on? Select activity tags:\n');
  for (const tag of tags) {
    console.log(`  ${tag.id}.  ${tag.name}`);
  }
  console.log('');
}

async function buildTagsFromSelection(
  context: { prompt: { ask: (q: string) => Promise<string> } },
  selection: string,
  tagsCatalog: ActivityTag[],
  otherTagId: number | undefined,
): Promise<SubmitTimesheetEntryTagInput[] | null> {
  const ids = selection
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => Number(part));

  if (ids.length === 0) {
    return [];
  }

  const tags: SubmitTimesheetEntryTagInput[] = [];

  for (const id of ids) {
    if (Number.isNaN(id) || !tagsCatalog.some((tag) => tag.id === id)) {
      console.log(`\nInvalid tag id: ${id}`);
      return null;
    }

    const tagInput: SubmitTimesheetEntryTagInput = { activityTagId: id };

    if (otherTagId !== undefined && id === otherTagId) {
      const customText = await context.prompt.ask('Custom text for Other tag: ');
      if (!customText.trim()) {
        console.log('\ncustomText is required when tag is Other.');
        return null;
      }
      tagInput.customText = customText.trim();
    }

    tags.push(tagInput);
  }

  return tags;
}

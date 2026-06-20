import { prisma } from '../client';
import { IActivityTagRepository } from '../../../domain/interfaces/IActivityTagRepository';
import { ActivityTagView } from '../../../domain/types/timesheet.types';

function mapActivityTag(tag: {
  id: number;
  name: string;
  sortOrder: number;
}): ActivityTagView {
  return {
    id: tag.id,
    name: tag.name,
    sortOrder: tag.sortOrder,
  };
}

export class PrismaActivityTagRepository implements IActivityTagRepository {
  async listAll(): Promise<ActivityTagView[]> {
    const tags = await prisma.activityTag.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return tags.map(mapActivityTag);
  }

  async findByIds(tagIds: number[]): Promise<ActivityTagView[]> {
    if (tagIds.length === 0) {
      return [];
    }

    const tags = await prisma.activityTag.findMany({
      where: { id: { in: tagIds } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return tags.map(mapActivityTag);
  }

  async findByName(name: string): Promise<ActivityTagView | null> {
    const tag = await prisma.activityTag.findUnique({
      where: { name },
    });

    return tag ? mapActivityTag(tag) : null;
  }
}

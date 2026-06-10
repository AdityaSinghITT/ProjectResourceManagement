import { ActivityTagView } from '../types/timesheet.types';

export interface IActivityTagRepository {
  listAll(): Promise<ActivityTagView[]>;
  findByIds(tagIds: number[]): Promise<ActivityTagView[]>;
  findByName(name: string): Promise<ActivityTagView | null>;
}

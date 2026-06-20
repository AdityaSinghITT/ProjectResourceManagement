import { HttpClient } from './HttpClient';
import { ActivityTag } from './types/employee.types';

export class ActivityTagsApi {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<{ tags: ActivityTag[] }> {
    return this.http.get<{ tags: ActivityTag[] }>('/api/activity-tags');
  }
}

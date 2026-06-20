import { AdminApi } from '../api/AdminApi';
import { ActivityTagsApi } from '../api/ActivityTagsApi';
import { AuthApi } from '../api/AuthApi';
import { EmployeeApi } from '../api/EmployeeApi';
import { ManagerApi } from '../api/ManagerApi';
import { SessionStore } from '../session/SessionStore';
import { Prompt } from '../ui/components/Prompt';

export interface AppContext {
  session: SessionStore;
  prompt: Prompt;
  auth: AuthApi;
  admin: AdminApi;
  manager: ManagerApi;
  employee: EmployeeApi;
  activityTags: ActivityTagsApi;
}

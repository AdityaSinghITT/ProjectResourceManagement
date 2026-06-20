import { AdminApi } from '../api/AdminApi';
import { ActivityTagsApi } from '../api/ActivityTagsApi';
import { AuthApi } from '../api/AuthApi';
import { EmployeeApi } from '../api/EmployeeApi';
import { HttpClient } from '../api/HttpClient';
import { ManagerApi } from '../api/ManagerApi';
import { getApiBaseUrl } from '../config/env';
import { SessionStore } from '../session/SessionStore';
import { Prompt } from '../ui/components/Prompt';
import { AppContext } from './AppContext';

export function createAppContext(): AppContext {
  const session = new SessionStore();
  const http = new HttpClient(getApiBaseUrl(), session);

  return {
    session,
    prompt: new Prompt(),
    auth: new AuthApi(http),
    admin: new AdminApi(http),
    manager: new ManagerApi(http),
    employee: new EmployeeApi(http),
    activityTags: new ActivityTagsApi(http),
  };
}

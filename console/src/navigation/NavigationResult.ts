import { Screen } from './Screen';

export type NavigationResult =
  | { type: 'stay' }
  | { type: 'back' }
  | { type: 'push'; screen: Screen }
  | { type: 'replace'; screen: Screen }
  | { type: 'logout'; screen: Screen }
  | { type: 'exit' };

import { AppContext } from '../app/AppContext';
import { NavigationResult } from './NavigationResult';

export interface Screen {
  readonly name: string;
  run(context: AppContext): Promise<NavigationResult>;
}

import { ProjectHealthStatus } from '../../api/types/manager.types';

export function formatHealthBadge(status: ProjectHealthStatus): string {
  switch (status) {
    case 'AT_RISK':
      return 'AT RISK';
    case 'ATTENTION':
      return 'ATTENTION';
    default:
      return 'ON TRACK';
  }
}

export function formatHealthBadgeWithIcon(status: ProjectHealthStatus): string {
  switch (status) {
    case 'AT_RISK':
      return '[!] AT RISK';
    case 'ATTENTION':
      return '[~] ATTENTION';
    default:
      return '[OK] ON TRACK';
  }
}

export function formatValidationViolations(violations: string[]): string {
  return violations.join('. ');
}

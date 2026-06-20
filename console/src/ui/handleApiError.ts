import { ApiError } from '../api/ApiError';

function databaseRetryHint(statusCode: number, message: string): string | null {
  const isDatabaseIssue =
    statusCode === 503 ||
    message.toLowerCase().includes('database') ||
    message.toLowerCase().includes('unreachable');

  if (!isDatabaseIssue) {
    return null;
  }

  return 'Tip: Neon may be waking up — wait a few seconds and try again.';
}

export function printApiError(error: unknown): void {
  if (error instanceof ApiError) {
    console.log(`\nError (${error.statusCode}): ${error.message}`);
    const hint = databaseRetryHint(error.statusCode, error.message);
    if (hint) {
      console.log(hint);
    }
    return;
  }

  if (error instanceof Error) {
    console.log(`\nError: ${error.message}`);
    return;
  }

  console.log('\nAn unexpected error occurred.');
}

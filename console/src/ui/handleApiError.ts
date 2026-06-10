import { ApiError } from '../api/ApiError';

export function printApiError(error: unknown): void {
  if (error instanceof ApiError) {
    console.log(`\nError: ${error.message}`);
    return;
  }

  if (error instanceof Error) {
    console.log(`\nError: ${error.message}`);
    return;
  }

  console.log('\nAn unexpected error occurred.');
}

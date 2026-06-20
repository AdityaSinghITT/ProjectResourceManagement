import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, '') : DEFAULT_API_BASE_URL;
}

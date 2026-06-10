import dotenv from 'dotenv';
import { EnvDefaults, EnvKeys } from '../shared/constants/envKeys';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env[EnvKeys.PORT] ?? String(EnvDefaults.PORT), 10),
  databaseUrl: requireEnv(EnvKeys.DATABASE_URL),
  jwtSecret: requireEnv(EnvKeys.JWT_SECRET),
  jwtExpiresIn: process.env[EnvKeys.JWT_EXPIRES_IN] ?? EnvDefaults.JWT_EXPIRES_IN,
};

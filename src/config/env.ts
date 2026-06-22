import { LlmProvider } from '@prisma/client';
import dotenv from 'dotenv';
import { EnvDefaults, EnvKeys } from '../shared/constants/envKeys';
import { LlmConfig } from '../shared/constants/llmConfig';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function parseLlmProvider(value: string | undefined): LlmProvider {
  if (value && Object.values(LlmProvider).includes(value as LlmProvider)) {
    return value as LlmProvider;
  }

  return LlmConfig.DEFAULT_PROVIDER;
}

export const env = {
  port: parseInt(process.env[EnvKeys.PORT] ?? String(EnvDefaults.PORT), 10),
  databaseUrl: requireEnv(EnvKeys.DATABASE_URL),
  jwtSecret: requireEnv(EnvKeys.JWT_SECRET),
  jwtExpiresIn: process.env[EnvKeys.JWT_EXPIRES_IN] ?? EnvDefaults.JWT_EXPIRES_IN,
  enableScheduler: process.env[EnvKeys.ENABLE_SCHEDULER] === 'true',
  llmBaseUrl: optionalEnv(EnvKeys.LLM_BASE_URL),
  llmApiKey: optionalEnv(EnvKeys.LLM_API_KEY),
  llmModel: optionalEnv(EnvKeys.LLM_MODEL),
  llmProvider: parseLlmProvider(process.env[EnvKeys.LLM_PROVIDER]),
  smtpHost: optionalEnv(EnvKeys.SMTP_HOST),
  smtpPort: process.env[EnvKeys.SMTP_PORT]
    ? parseInt(process.env[EnvKeys.SMTP_PORT]!, 10)
    : null,
  smtpUser: optionalEnv(EnvKeys.SMTP_USER),
  smtpPass: optionalEnv(EnvKeys.SMTP_PASS),
  emailFrom: optionalEnv(EnvKeys.EMAIL_FROM),
};

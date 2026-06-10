export const EnvKeys = {
  DATABASE_URL: 'DATABASE_URL',
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
  PORT: 'PORT',
  NODE_ENV: 'NODE_ENV',
} as const;

export const EnvDefaults = {
  PORT: 3000,
  JWT_EXPIRES_IN: '24h',
} as const;

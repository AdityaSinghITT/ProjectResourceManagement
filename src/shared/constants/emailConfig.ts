export const EmailConfig = {
  DEFAULT_FROM: 'prm-tool@techserve.local',
  SMTP_PORT: 2525,
  /** Pause between SMTP sends to avoid Mailtrap free-tier rate limits. */
  SEND_DELAY_MS: 600,
} as const;

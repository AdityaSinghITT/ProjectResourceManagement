import { env } from '../../config/env';
import { IEmailSender } from '../../domain/interfaces/IEmailSender';
import { EmailConfig } from '../../shared/constants/emailConfig';
import { ConsoleEmailSender } from './ConsoleEmailSender';
import { NodemailerEmailSender } from './NodemailerEmailSender';

export function createEmailSender(): IEmailSender {
  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    return new NodemailerEmailSender({
      host: env.smtpHost,
      port: env.smtpPort ?? EmailConfig.SMTP_PORT,
      user: env.smtpUser,
      pass: env.smtpPass,
      from: env.emailFrom ?? EmailConfig.DEFAULT_FROM,
    });
  }

  return new ConsoleEmailSender();
}

import { IEmailSender, EmailMessage } from '../../domain/interfaces/IEmailSender';
import { appLogger } from '../../shared/logger/appLogger';

export class ConsoleEmailSender implements IEmailSender {
  async send(message: EmailMessage): Promise<void> {
    appLogger.info('Email (console fallback)', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

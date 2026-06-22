import nodemailer from 'nodemailer';
import { IEmailSender, EmailMessage } from '../../domain/interfaces/IEmailSender';
import { EmailConfig } from '../../shared/constants/emailConfig';
import { appLogger } from '../../shared/logger/appLogger';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface NodemailerEmailSenderOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class NodemailerEmailSender implements IEmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly sendDelayMs: number;
  private sendChain: Promise<void> = Promise.resolve();

  constructor(options: NodemailerEmailSenderOptions, sendDelayMs = EmailConfig.SEND_DELAY_MS) {
    this.from = options.from;
    this.sendDelayMs = sendDelayMs;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      auth: {
        user: options.user,
        pass: options.pass,
      },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    const sendTask = this.sendChain.then(async () => {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      appLogger.info('Email sent', { to: message.to, subject: message.subject });

      if (this.sendDelayMs > 0) {
        await delay(this.sendDelayMs);
      }
    });

    this.sendChain = sendTask.catch(() => undefined);
    await sendTask;
  }
}

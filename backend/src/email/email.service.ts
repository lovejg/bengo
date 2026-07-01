import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Gmail SMTP 기반 이메일 전송 서비스.
 *
 * 필요 env:
 * - SMTP_USER: Gmail 주소
 * - SMTP_PASS: Gmail 앱 비밀번호 (https://myaccount.google.com/apppasswords)
 * - SMTP_FROM: 발신자 표시명 (예: "Bengo <noreply@bengo.app>")
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(configService: ConfigService) {
    const user = configService.get<string>('SMTP_USER') ?? '';
    const pass = configService.get<string>('SMTP_PASS') ?? '';
    this.fromAddress = configService.get<string>('SMTP_FROM') ?? user;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    const subject = '[Bengo] 이메일 인증을 완료해주세요';
    const html = this.buildVerificationHtml(verificationUrl);

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private buildVerificationHtml(verificationUrl: string): string {
    return `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Bengo 이메일 인증</h2>
        <p>아래 버튼을 눌러 이메일 인증을 완료해주세요. 링크는 24시간 동안 유효합니다.</p>
        <p style="margin: 32px 0;">
          <a href="${verificationUrl}"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 6px;">
            이메일 인증하기
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          버튼이 동작하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br/>
          <span style="word-break: break-all;">${verificationUrl}</span>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">
          본인이 가입하지 않았다면 이 메일을 무시해주세요.
        </p>
      </div>
    `;
  }
}

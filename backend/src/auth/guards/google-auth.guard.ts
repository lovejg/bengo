import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Fastify 환경에서 Passport 세션 직렬화를 비활성화 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions() {
    return { session: false };
  }
}

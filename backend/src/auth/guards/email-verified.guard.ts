import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { UsersService } from '../../users/users.service';

/**
 * 이메일 인증을 완료한 사용자만 접근 허용.
 * JwtAuthGuard 다음에 사용해야 함 (req.user가 채워진 상태 전제).
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const jwtUser = request.user;
    if (!jwtUser?.sub) {
      throw new ForbiddenException('인증 정보가 필요합니다.');
    }

    const user = await this.usersService.findById(jwtUser.sub);
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('이메일 인증이 필요한 기능입니다.');
    }
    return true;
  }
}

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { User } from '../database/entities';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'findById' | 'updatePassword'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'sendVerificationEmail'>>;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    emailService = { sendVerificationEmail: jest.fn() };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      emailService as unknown as EmailService,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: null,
      emailVerified: false,
      displayName: null,
      profile: null,
      ...overrides,
    }) as User;

  describe('login', () => {
    it('존재하지 않는 사용자면 UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'none@example.com', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('비밀번호가 틀리면 UnauthorizedException', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('비밀번호가 맞으면 accessToken을 발급한다', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmail.mockResolvedValue(makeUser({ passwordHash, emailVerified: true }));

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('changePassword', () => {
    it('OAuth 전용 가입자(passwordHash 없음)는 BadRequestException', async () => {
      usersService.findById.mockResolvedValue(makeUser({ passwordHash: null }));

      await expect(service.changePassword('user-1', 'current', 'new')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('새 비밀번호가 현재와 같으면 BadRequestException', async () => {
      const passwordHash = await bcrypt.hash('same-password', 10);
      usersService.findById.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.changePassword('user-1', 'same-password', 'same-password'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('현재 비밀번호가 맞고 새 비밀번호가 다르면 updatePassword를 호출한다', async () => {
      const passwordHash = await bcrypt.hash('current-password', 10);
      usersService.findById.mockResolvedValue(makeUser({ passwordHash }));

      await service.changePassword('user-1', 'current-password', 'new-password');

      expect(usersService.updatePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('resendVerification', () => {
    it('이미 인증된 사용자에게는 이메일을 재발송하지 않는다 (존재 여부 비노출)', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.resendVerification('test@example.com');

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('쿨다운 시간 내 재요청이면 BadRequestException', async () => {
      usersService.findByEmail.mockResolvedValue(
        makeUser({ emailVerified: false, lastVerificationSentAt: new Date() }),
      );

      await expect(service.resendVerification('test@example.com')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});

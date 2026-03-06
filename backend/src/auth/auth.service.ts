import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UserProfile } from '../database/entities';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(input: SignupDto): Promise<AuthResponseDto> {
    const created = await this.usersService.createUser(input);
    return this.buildAuthResponse(created.user.id, created.user.email, created.profile);
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!user.profile) {
      const profile = await this.usersService.findProfileOrFail(user.id);
      return this.buildAuthResponse(user.id, user.email, profile);
    }

    return this.buildAuthResponse(user.id, user.email, user.profile);
  }

  private buildAuthResponse(
    userId: string,
    email: string,
    profile: Pick<UserProfile, 'age' | 'gender' | 'regionCode' | 'interests'>,
  ): AuthResponseDto {
    const payload = {
      sub: userId,
      email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        userId,
        email,
        age: profile.age,
        gender: profile.gender,
        regionCode: profile.regionCode,
        interests: profile.interests,
      },
    };
  }
}

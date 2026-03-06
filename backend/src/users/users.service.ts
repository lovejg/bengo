import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { User, UserProfile } from '../database/entities';
import { CreateUserInput } from './types/create-user-input.type';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  async createUser(input: CreateUserInput): Promise<{ user: User; profile: UserProfile }> {
    const existing = await this.userRepository.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await this.dataSource.transaction(async (manager) => {
      const createdUser = manager.create(User, {
        email: input.email,
        passwordHash,
      });
      const user = await manager.save(User, createdUser);

      const createdProfile = manager.create(UserProfile, {
        userId: user.id,
        age: input.age,
        gender: input.gender,
        regionCode: input.regionCode,
        interests: input.interests,
      });
      const profile = await manager.save(UserProfile, createdProfile);

      return { user, profile };
    });

    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  async findProfileOrFail(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('사용자 프로필을 찾을 수 없습니다.');
    }

    return profile;
  }
}

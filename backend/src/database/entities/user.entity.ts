import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EligibilityCheck } from './eligibility-check.entity';
import { OAuthAccount } from './oauth-account.entity';
import { UserPolicyState } from './user-policy-state.entity';
import { UserProfile } from './user-profile.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  /** OAuth 전용 가입자는 비밀번호가 없으므로 nullable */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  /** OAuth provider가 제공한 표시 이름 (선택) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName!: string | null;

  /** OAuth 가입자는 provider가 이메일 검증 완료 → true로 시작. 일반 가입자는 인증 후 true */
  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt!: Date | null;

  /** 인증 메일 재발송 쿨다운 추적용 */
  @Column({ type: 'timestamptz', nullable: true })
  lastVerificationSentAt!: Date | null;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile!: UserProfile | null;

  @OneToMany(() => OAuthAccount, (account) => account.user)
  oauthAccounts!: OAuthAccount[];

  @OneToMany(() => EligibilityCheck, (check) => check.user)
  eligibilityChecks!: EligibilityCheck[];

  @OneToMany(() => UserPolicyState, (state) => state.user)
  policyStates!: UserPolicyState[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

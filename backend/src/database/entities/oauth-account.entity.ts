import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OAuthProvider } from '../../common/enums/oauth-provider.enum';
import { User } from './user.entity';

/**
 * 한 user는 여러 OAuth provider를 연결할 수 있음.
 * (provider, providerId) 조합은 unique — 동일 구글/네이버 계정이 두 user에 매달리지 않도록.
 */
@Entity({ name: 'oauth_accounts' })
@Index(['provider', 'providerId'], { unique: true })
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider!: OAuthProvider;

  /** OAuth provider가 부여한 사용자 식별자 (Google sub, Naver id 등) */
  @Column({ type: 'varchar', length: 255 })
  providerId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

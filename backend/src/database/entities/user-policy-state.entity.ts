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
import { UserPolicyState as UserPolicyStateEnum } from '../../common/enums/user-policy-state.enum';
import { Policy } from './policy.entity';
import { User } from './user.entity';

@Entity({ name: 'user_policy_states' })
@Index(['userId', 'policyId'], { unique: true })
export class UserPolicyState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(() => User, (user) => user.policyStates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Policy, (policy) => policy.userStates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy!: Policy;

  @Column({
    type: 'enum',
    enum: UserPolicyStateEnum,
    default: UserPolicyStateEnum.DISCOVERED,
  })
  state!: UserPolicyStateEnum;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  appliedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

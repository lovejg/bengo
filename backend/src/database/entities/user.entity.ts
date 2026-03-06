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
import { UserPolicyState } from './user-policy-state.entity';
import { UserProfile } from './user-profile.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile!: UserProfile;

  @OneToMany(() => EligibilityCheck, (check) => check.user)
  eligibilityChecks!: EligibilityCheck[];

  @OneToMany(() => UserPolicyState, (state) => state.user)
  policyStates!: UserPolicyState[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { InterestCategory } from '../../common/enums/interest-category.enum';
import { PolicyStatus } from '../../common/enums/policy-status.enum';
import { PolicyType } from '../../common/enums/policy-type.enum';
import { RegionCode } from '../../common/enums/region-code.enum';
import { EligibilityCheck } from './eligibility-check.entity';
import { PolicyRequirement } from './policy-requirement.entity';
import { PolicyRule } from './policy-rule.entity';
import { UserPolicyState } from './user-policy-state.entity';

@Entity({ name: 'policies' })
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  shortDescription!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  providerName!: string;

  @Column({ type: 'text', nullable: true })
  sourceUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  applicationUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  applicationMethod!: string | null;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  status!: PolicyStatus;

  @Column({ type: 'enum', enum: PolicyType, default: PolicyType.APPLICATION })
  policyType!: PolicyType;

  @Column({ type: 'enum', enum: InterestCategory, array: true, default: '{}' })
  categories!: InterestCategory[];

  @Column({ type: 'enum', enum: RegionCode, array: true, default: '{}' })
  regionCodes!: RegionCode[];

  @Column({ type: 'enum', enum: Gender, array: true, default: '{}' })
  targetGenders!: Gender[];

  @Column({ type: 'int', nullable: true })
  minAge!: number | null;

  @Column({ type: 'int', nullable: true })
  maxAge!: number | null;

  @Column({ type: 'date', nullable: true })
  startsAt!: string | null;

  @Column({ type: 'date', nullable: true })
  endsAt!: string | null;

  @Column({ type: 'boolean', default: false })
  isAlwaysOpen!: boolean;

  @Column({ type: 'text', nullable: true })
  periodRaw!: string | null;

  @Column({ type: 'text', nullable: true })
  targetDescription!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  extraMeta!: Record<string, unknown>;

  @OneToMany(() => PolicyRequirement, (requirement) => requirement.policy)
  requirements!: PolicyRequirement[];

  @OneToMany(() => PolicyRule, (rule) => rule.policy)
  rules!: PolicyRule[];

  @OneToMany(() => EligibilityCheck, (check) => check.policy)
  checks!: EligibilityCheck[];

  @OneToMany(() => UserPolicyState, (state) => state.policy)
  userStates!: UserPolicyState[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

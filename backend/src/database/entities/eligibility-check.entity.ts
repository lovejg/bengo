import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EligibilityResult } from '../../common/enums/eligibility-result.enum';
import { Policy } from './policy.entity';
import { User } from './user.entity';

@Entity({ name: 'eligibility_checks' })
export class EligibilityCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(() => User, (user) => user.eligibilityChecks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Policy, (policy) => policy.checks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy!: Policy;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  inputAnswers!: Record<string, unknown>;

  @Column({ type: 'enum', enum: EligibilityResult })
  result!: EligibilityResult;

  @Column({ type: 'text', array: true, default: '{}' })
  reasons!: string[];

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'int', nullable: true })
  evaluatedRuleVersion!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RuleDefinition } from '../../common/interfaces/rule-expression.interface';
import { Policy } from './policy.entity';

@Entity({ name: 'policy_rules' })
export class PolicyRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(() => Policy, (policy) => policy.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy!: Policy;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'jsonb' })
  definition!: RuleDefinition;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

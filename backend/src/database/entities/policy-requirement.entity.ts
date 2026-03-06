import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionType } from '../../common/enums/question-type.enum';
import { Policy } from './policy.entity';

@Entity({ name: 'policy_requirements' })
export class PolicyRequirement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne(() => Policy, (policy) => policy.requirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy!: Policy;

  @Column({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'varchar', length: 160 })
  label!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: QuestionType })
  type!: QuestionType;

  @Column({ type: 'jsonb', nullable: true })
  options!: string[] | null;

  @Column({ type: 'boolean', default: true })
  isRequired!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

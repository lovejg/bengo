import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Policy } from './policy.entity';
import { RawPolicyDocumentEntity } from './raw-policy-document.entity';

@Entity({ name: 'pipeline_ingestion_runs' })
export class PipelineIngestionRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rawDocumentId!: string;

  @ManyToOne(() => RawPolicyDocumentEntity, (raw) => raw.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rawDocumentId' })
  rawDocument!: RawPolicyDocumentEntity;

  @Column({ type: 'uuid', nullable: true })
  policyId!: string | null;

  @ManyToOne(() => Policy, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'policyId' })
  policy!: Policy | null;

  @Column({ type: 'jsonb' })
  normalized!: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  validation!: Record<string, unknown>;

  @Column({ type: 'boolean' })
  persisted!: boolean;

  @Column({ type: 'varchar', length: 16 })
  action!: 'created' | 'updated' | 'skipped' | 'failed';

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

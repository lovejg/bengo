import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineIngestionRun } from './pipeline-ingestion-run.entity';

@Entity({ name: 'raw_policy_documents' })
export class RawPolicyDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  source!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl!: string | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'timestamptz' })
  fetchedAt!: Date;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @OneToMany(() => PipelineIngestionRun, (run) => run.rawDocument)
  runs!: PipelineIngestionRun[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

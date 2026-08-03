import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('saas_idempotency_record')
@Index(['scope', 'key'], { unique: true })
export class IdempotencyRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  scope: string;

  @Column({ length: 160 })
  key: string;

  @Column({ length: 64 })
  requestHash: string;

  @Column({ length: 30, default: 'processing' })
  status: 'processing' | 'completed' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

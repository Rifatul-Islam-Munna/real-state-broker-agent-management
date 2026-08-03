import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('saas_admin_audit_log')
@Index(['createdAt'])
@Index(['entityType', 'entityId'])
export class SaasAdminAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  action: string;

  @Column({ length: 80 })
  entityType: string;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

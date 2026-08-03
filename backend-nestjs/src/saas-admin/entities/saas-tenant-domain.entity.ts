import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('saas_tenant_domain')
@Index(['hostname'], { unique: true })
@Index(['tenantId', 'type'])
export class SaasTenantDomain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tenantId: number;

  @Column({ length: 253 })
  hostname: string;

  @Column({ length: 30 })
  type: 'subdomain' | 'custom';

  @Column({ length: 30, default: 'pending' })
  status: 'pending' | 'verified' | 'disabled';

  @Column({ type: 'varchar', length: 96, nullable: true })
  verificationToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastCheckedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

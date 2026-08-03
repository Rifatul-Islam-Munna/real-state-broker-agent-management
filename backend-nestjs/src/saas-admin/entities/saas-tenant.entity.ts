import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('saas_tenant')
@Index(['businessName'], { unique: true })
@Index(['slug'], { unique: true })
export class SaasTenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 160 })
  businessName: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ length: 140, unique: true })
  subdomain: string;

  @Column({ type: 'int', nullable: true })
  ownerUserId: number | null;

  @Column({ type: 'int', nullable: true })
  planId: number | null;

  @Column({ type: 'simple-json', default: '[]' })
  dashboardPermissions: string[];

  @Column({ length: 40, default: 'ready' })
  provisioningStatus: string;

  @Column({ type: 'varchar', length: 63, unique: true, nullable: true })
  databaseName: string | null;

  @Column({ length: 40, default: 'pending' })
  databaseStatus: string;

  @Column({ type: 'timestamptz', nullable: true })
  databaseProvisionedAt: Date | null;

  @ManyToOne(() => SubscriptionPlan, { nullable: true, onDelete: 'SET NULL' })
  plan?: SubscriptionPlan | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionStartsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

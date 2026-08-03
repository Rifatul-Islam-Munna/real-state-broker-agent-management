import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PlanDashboardPermission {
  NormalDashboard = 'normal-dashboard',
  PropertyManagementDashboard = 'property-management-dashboard',
}

@Entity('saas_subscription_plan')
@Index(['name'], { unique: true })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'int', default: 30 })
  billingDays: number;

  @Column({ type: 'simple-json', default: '[]' })
  dashboardPermissions: PlanDashboardPermission[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

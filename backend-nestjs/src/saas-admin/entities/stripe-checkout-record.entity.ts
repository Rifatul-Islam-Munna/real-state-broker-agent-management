import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type StripeCheckoutKind = 'purchase' | 'renewal';
export type StripeCheckoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('saas_stripe_checkout_record')
@Index(['stripeSessionId'], { unique: true })
export class StripeCheckoutRecord {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  kind: StripeCheckoutKind;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: StripeCheckoutStatus;

  @Column({ type: 'int' })
  planId: number;

  @Column({ type: 'int', nullable: true })
  tenantId: number | null;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSessionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

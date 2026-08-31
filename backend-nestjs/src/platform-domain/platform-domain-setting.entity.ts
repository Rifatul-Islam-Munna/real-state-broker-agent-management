import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('saas_platform_domain_setting')
export class PlatformDomainSetting {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ length: 253 })
  primaryDomain: string;

  @Column({ type: 'text', nullable: true })
  stripeSecretKeyEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  stripeWebhookSecretEncrypted: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePublishableKey: string | null;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  stripeCurrency: string;

  @Column({ type: 'jsonb', nullable: true })
  chatbotAiConfig: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  chatbotAiApiKeyEncrypted: string | null;

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

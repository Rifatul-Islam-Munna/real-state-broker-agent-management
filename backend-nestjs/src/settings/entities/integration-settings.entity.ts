import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agency_integration_settings')
export class AgencyIntegrationSettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text', nullable: true })
  twilioPayload: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  twilioUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  aiProviderPayload: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  aiProviderUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  smtpPayload: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  smtpUpdatedAt: Date | null;

  @Column({ name: 'payment_payload', type: 'text', nullable: true })
  gatewayPayload: string | null;

  @Column({ name: 'payment_updated_at', type: 'timestamptz', nullable: true })
  gatewayUpdatedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

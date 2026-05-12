import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agency_integration_settings')
export class AgencyIntegrationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  twilioPayload: string | null;

  @Column({ type: 'timestamp', nullable: true })
  twilioUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  aiProviderPayload: string | null;

  @Column({ type: 'timestamp', nullable: true })
  aiProviderUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  smtpPayload: string | null;

  @Column({ type: 'timestamp', nullable: true })
  smtpUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  workspacePayload: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

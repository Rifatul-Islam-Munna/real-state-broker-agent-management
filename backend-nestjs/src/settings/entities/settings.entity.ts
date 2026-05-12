import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agency_settings')
export class AgencySettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Elite Estates' })
  agencyName: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('agency_integration_settings')
export class AgencyIntegrationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, select: false })
  gmailRefreshToken: string;

  @Column({ nullable: true, select: false })
  gmailClientSecret: string;

  @Column({ nullable: true })
  gmailEmailAddress: string;

  @Column({ default: false })
  isGmailConnected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Property } from '../../properties/entities/property.entity';

@Entity('realtor_showing')
export class RealtorShowing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  realtorName: string;

  @Column({ default: '' })
  realtorEmail: string;

  @Column({ default: '' })
  realtorPhone: string;

  @Column({ type: 'timestamptz', nullable: true })
  showingAt: Date | null;

  @Column({ default: '' })
  propertyText: string;

  @Column({ type: 'int', nullable: true })
  propertyId: number | null;

  @ManyToOne(() => Property, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property: Property | null;

  @Column({ type: 'float', default: 0 })
  propertyMatchScore: number;

  @Column({ default: 'Unmatched' })
  propertyMatchMethod: string;

  @Column({ default: '' })
  visitorName: string;

  @Column({ default: '' })
  visitorEmail: string;

  @Column({ default: '' })
  visitorPhone: string;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @Column({ default: false })
  emailEnabled: boolean;

  @Column({ default: false })
  smsEnabled: boolean;

  @Column({ default: '' })
  directTemplateId: string;

  @Column({ default: false })
  followUpEnabled: boolean;

  @Column({ default: 'active' })
  sequenceStatus: 'active' | 'paused' | 'cancelled' | 'completed';

  @Column({ default: 'direct' })
  sequenceStep: string;

  @Column({ default: false })
  replyReceived: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  replyReceivedAt: Date | null;

  @Column({ default: '' })
  followUpTemplateId: string;

  @Column({ default: 0 })
  followUpGapDays: number;

  @Column({ type: 'timestamptz', nullable: true })
  outreachAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  sourceData: Record<string, string>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
